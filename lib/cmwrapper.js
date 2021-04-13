(function(CodeMirror) {

    CodeMirror.defineOption('required', '', function(cm, val, old) {
        const prev = old && old != CodeMirror.Init;
        if (val && !prev) {
            cm.on('blur', onChange);
            cm.on('change', onChange);
            cm.on('swapDoc', onChange);
            onChange(cm);
        } else if (!val && prev) {
            cm.on('blur', onChange);
            cm.off('change', onChange);
            cm.off('swapDoc', onChange);
            const wrapper = cm.getWrapperElement();
            wrapper.className = wrapper.className.replace(' CodeMirror-required', '');

        }
        if(val &&!cm.hasFocus()) onChange(cm);
    });

    const isEmpty = function(cm) {
        return (cm.lineCount() === 1) && (cm.getLine(0) === '');
    };

    const onChange = function(cm) {
        const wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
        wrapper.className = wrapper.className.replace(' CodeMirror-required', '') +
            (empty ? ' CodeMirror-required' : '');
    };
})(window.CodeMirror);

window.cmWrapper = (function() {
    
    const CodeMirror = window.CodeMirror;

    const init = (textarea) => {
        const completeAfter = function(cm, pred) {
            //var cur = cm.getCursor();
            if (!pred || pred()) setTimeout(function() {
                if (!cm.state.completionActive)
                    cm.showHint({completeSingle: false});
            }, 100);
            return CodeMirror.Pass;
        };

        const completeIfAfterLt = function(cm) {
            return completeAfter(cm, function() {
                var cur = cm.getCursor();
                return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == '<';
            });
        };

        const completeIfInTag = function(cm) {
            return completeAfter(cm, function() {
                var tok = cm.getTokenAt(cm.getCursor());
                if (tok.type === 'string' && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
                var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
                return inner.tagName;
            });
        };

        const cm = CodeMirror.fromTextArea(textarea, {
            mode: 'xml',
            required: (textarea.required ? true : false),
            lineNumbers: false,
            extraKeys: {
                '\'<\'': completeAfter,
                '\'/\'': completeIfAfterLt,
                '\' \'': completeIfInTag,
                '\'=\'': completeIfInTag,
                'Ctrl-Space': 'autocomplete'
            },
            hintOptions: {schemaInfo: getSchema(textarea.dataset.schema)},
            lint: true,
            gutters: ['CodeMirror-lint-markers'],
            lineWrapping: true,
        });
        if(textarea.rows)
            cm.setSize(null,`${textarea.rows * 2.4}rem`);
        //cm.performLint();
        return cm;
    };

    const getSchema = function(s) {
        const schemae = {
            transcription: ['milestone','lb','pb','add','del','seg','subst','supplied','surplus','space','unclear','gap', 'damage','supplied','g'], 
            descriptive_restricted: ['term','note','emph','ex','expan','title','locus','material','ref','q','date','watermark','list','item'],
            names: ['persName','orgName','geogName'],
        };
        schemae.descriptive = ['p','lg',...schemae.descriptive_restricted,'quote'];
        
        const attrs = {
            units: ['akṣara','character'],
            langs: ['ta','ta-Taml','en','fr','de','pt','pi','sa']
        };

        const selected = s ? 
            s.split(' ').map(str => schemae[str]) : 
            Object.values(schemae);
        const tags = {
            '!top': Array.prototype.concat(...selected),
            '!attrs': {
            },

            // Text division & Page layout
            pb: {
                attrs: {
                    n: null,
                    facs: null,
                    '/': null,
                }
            },
            lb: {
                attrs: {
                    n: null,
                    '/': null,
                    break: ['no'],
                }
            },
            milestone: {
                attrs: {
                    n: null,
                    unit: ['folio','page'],
                    facs: null,
                    '/': null,
                }
            },
            space: {
                attrs: {
                    quantity: null,
                    rend: ['overline','dash'],
                    '/': null,
                }
            },
            g: {
                attrs: {
                    ref: ['#pcl','#pcs'],
                },
            },
            
            // Text emendations

            add: {
                attrs: {
                    rend: ['caret','above','below'],
                    place: ['above','below','left','right','top','bottom','margin'],
                },
                children: ['unclear'],
            },
            del: {
                attrs: {
                    rend: ['overstrike','understrike','strikethrough','scribble','line above', 'two lines above'],
                },
                children: ['gap','unclear']
            },
            subst: {
                attrs: {
                    rend: ['arrow','caret','kākapāda'],
                },
                children: ['add','del']
            },

            // Difficult or missing text
            unclear: {
                attrs: {
                    reason: ['blemish','rubbed','messy','damaged'],
                }
            },
            damage: {
                attrs: {
                    agent: ['worms','rubbing','smoke'],
                    unit: attrs.units,
                    quantity: null,
                },
                children: ['supplied'],
            },
            gap: {
                attrs: {
                    reason: ['illegible','damaged'],
                    unit: attrs.units,
                    quantity: null,
                },
            },
            
            // editorial
            supplied: {
                attrs: {
                    reason: ['illegible','damaged','omitted'],
                },
            },
            surplus: {
                attrs: {
                    reason: ['repeated'],
                },
                children: ['unclear']
            },
            seg: {
                attrs: {
                    'function': ['blessing','colophon','commenting-note','completion-statement','chapter-heading','correction','dedication','documenting-note','end-title','explicit','gloss','heading','incipit','intertitle','invocation','postface','preface','register','rubric','running-title','satellite-stanza','shelfmark','stamp','title','table-of-contents','verse-beginning'],
                },
                children: [...schemae.transcription,...schemae.names]
            },

            // descriptive
            date: {
                attrs: {
                    'when': null,
                },
            },
            ex: {
                attrs: {
                    'xml:lang': attrs.langs,
                }
            },
            expan: {
                attrs: {
                    'xml:lang': attrs.langs,
                }
            },
            item: {
                children: ['emph','del','add','expan','subst','title','locus']
            },
            l: {
                children: [...schemae.transcription,...schemae.descriptive,...schemae.names],
                attrs: {
                    'xml:lang': attrs.langs
                }
            },
            lg: {
                children: ['l'],
                attrs: {
                    'xml:lang': attrs.langs
                }
            },
            list: {
                attrs: {
                    'rend': ['numbered']
                },
                children: ['item']
            },
            p: {
                attrs: {
                    'xml:lang': attrs.langs,
                },
                children: [...schemae.transcription,...schemae.descriptive,...schemae.names],
            },
            term: {
                attrs: {
                    'xml:lang': attrs.langs,
                },
            },
            note: {
                attrs: {
                    'xml:lang': attrs.langs,
                },
                children: ['locus','title','emph','term'],
            },
            title: {
                attrs: {
                    'xml:lang': attrs.langs,
                    'type': ['article'],
                },
                children: ['emph'],
            },
            emph: {
                attrs: {
                    'rend': ['bold','italic'],
                    'xml:lang': attrs.langs,
                },
            },
            locus: {
                attrs: {
                    facs: null,
                    'xml:lang': ['en','fr'],
                }
            },
            material: {
                attrs: {
                    'xml:lang': attrs.langs,
                },
            },
            
            ref: {
                attrs: {
                    'target': null,
                },
            },

            q: {
                attrs: {
                    'xml:lang': attrs.langs,
                },
                children: ['emph','persName']
            },

            quote: {
                attrs: {
                    'xml:lang': attrs.langs,
                    'rend': ['block']
                },
                children: ['lg','emph',...schemae.names]
            },
            
            watermark: {
                attrs: null,
                children: null,
            },
            // names
            
            persName: {
                attrs: {
                    'xml:id': null,
                    'role': ['author','commentator','scribe','editor'],
                },
            },
            orgName: {
                attrs: {
                    'xml:id': null,
                },
            },
            geogName: {
                attrs: {
                    'xml:id': null,
                },
            },
        };
        return tags;
    };

    return {
        init: init,
    };
})(); 