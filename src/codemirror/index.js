import CodeMirror from 'codemirror';
import 'codemirror/mode/xml/xml';
import 'codemirror/addon/hint/show-hint';
import './lib/xml-hint.js';
import './lib/htmlhint-custom.js';
import 'codemirror/addon/lint/lint';
import './lib/xml-lint.js';
import 'codemirror/addon/display/placeholder';
import definitions from './definitions.mjs';

CodeMirror.defineOption('required', '', function(cm, val, old) {
    const prev = old && old != CodeMirror.Init;
    if (val && !prev) {
        cm.on('blur', onChange);
        cm.on('change', onChange);
        cm.on('swapDoc', onChange);
        cm.on('paste',handlePaste);
        onChange(cm);
    } else if (!val && prev) {
        cm.on('blur', onChange);
        cm.off('change', onChange);
        cm.off('swapDoc', onChange);
        cm.on('paste',handlePaste);
        const wrapper = cm.getWrapperElement();
        wrapper.className = wrapper.className.replace(' CodeMirror-required', '');

    }
    if(val &&!cm.hasFocus()) onChange(cm);
});

const isEmpty = function(cm) {
    return (cm.lineCount() === 1) && (cm.getLine(0) === '');
};

const handlePaste = function(cm, e) {
    const types = e.clipboardData.types;
    if(!types.includes('text/html')) return;

    const html = (new DOMParser()).parseFromString(e.clipboardData.getData('text/html'),'text/html');
    const bold = html.querySelectorAll('b');
    for(const b of bold) {
        b.textContent = '<emph rend="bold">' + b.textContent + '</emph>';
    }
    const text = html.body.textContent.replace(/\n/g,' ');
    const start = cm.getCursor('start');
    const end = cm.getCursor('end');
    cm.replaceRange(text,start,end);

    e.preventDefault();
};

const onChange = function(cm) {
    const wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
    wrapper.className = wrapper.className.replace(' CodeMirror-required', '') +
        (empty ? ' CodeMirror-required' : '');
};

/*
CodeMirror.defineMode('mixed', function(config) {
    return CodeMirror.multiplexingMode(
        CodeMirror.getMode(config, 'xml'),
        {open: '{', close: '}',
            mode: CodeMirror.getMode(config, 'null'),
            delimStyle: 'delimit'}
    );
});

const hintEntity = (cm,options) => {
    const cur = cm.getCursor();
    const to = {line: cur.line, ch: cur.ch};
    const from = options.from || (() => {
        const tok = cm.getTokenAt(cur);
        return {line: cur.line, ch: tok.start-1};
    })();
    const list = [
        {displayText: 'pcs', text: '<g ref="#pcs"/>'},
        {displayText: 'pcl', text: '<g ref="#pcl"/>'},
        {displayText: 'varuṣam', text: '<g ref="#varudam"/>'},
        {displayText: 'mācam', text: '<g ref="#maatham"/>'},      
        {displayText: 'mēṟpaṭi', text: '<g ref="#merpadi"/>'},      
    ];
    const word = cm.getTokenAt(cur).string;
    const newlist = word === '{' ? 
        list :
        list.filter(el => el.displayText.startsWith(word));
    return {list: newlist, from: from, to: to};
};

CodeMirror.registerHelper('hint','null',hintEntity);
*/
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
    /*
    const completeEntity = (cm) => {
        const cur = cm.getCursor();
        const from = {line: cur.line, ch: cur.ch};
        window.setTimeout(function() {
            if (!cm.state.completionActive)
                cm.showHint({hint: CodeMirror.hint.null, from: from});
        },100);
        return CodeMirror.Pass;
    };
    */
    const cm = CodeMirror.fromTextArea(textarea, {
        mode: 'xml',
        //mode: 'mixed',
        //inputStyle: 'contenteditable',
        required: (textarea.required ? true : false),
        lineNumbers: false,
        extraKeys: {
            '\'<\'': completeAfter,
            '\'/\'': completeIfAfterLt,
            '\' \'': completeIfInTag,
            '\'=\'': completeIfInTag,
            //'\'{\'': completeEntity,
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
    cm.TSTshouldRefresh = false;
    cm.on('focus', (cm) => {
        if(cm.TSTshouldRefresh) {
            cm.refresh();
            cm.TSTshouldRefresh = false;
        }
    });
    return cm;
};

const getSchema = function(s) {
    const schemae = {
        transcription_restricted: ['milestone','lb','cb','pb','add','choice','del','seg','subst','supplied','surplus','hi','space','unclear','gap','damage','g','num'], 
        descriptive_restricted: ['term','note','emph','ex','expan','foreign','title','locus','material','ref','q','date','watermark','list','item','stamp'],
        names: ['persName','orgName','geogName','placeName'],
    };
    schemae.transcription = ['p','ab','fw',...schemae.transcription_restricted];
    schemae.descriptive = ['p','lg',...schemae.descriptive_restricted,'quote'];
    
    const attrs = {
        units: ['akṣara','character'],
        langs: ['ta','ta-Taml','en','fr','bra','de','gu','la','ml','mr','pt','pi','raj','sa'],
        bigunits: ['folio','page','column','left-margin','right-margin','main-text-area'],
        place: ['in-place','above','below','left','right','top','bottom','margin','foot']
    };

    const selected = s ? 
        s.split(' ').map(str => schemae[str]) : 
        Object.values(schemae);
    const tags = {
        '!top': Array.prototype.concat(...selected),
        '!attrs': {
        },

        // Text division & Page layout
        
        ab: {
            attrs: {
                'xml:lang': attrs.langs,
            },
            children: [...schemae.transcription,...schemae.descriptive,...schemae.names],
        },
        fw: {
            attrs: {
                place: ['top-margin','left-margin','bottom-margin','right-margin'],
                'xml:lang': attrs.langs,
            },
            children: [...schemae.transcription,...schemae.descriptive,...schemae.names],
        },
        pb: {
            attrs: {
                n: null,
                facs: null,
                break: ['no'],
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
        cb: {
            attrs: {
                n: null,
                '/': null,
                break: ['no'],
            }
        },
        milestone: {
            attrs: {
                n: null,
                unit: attrs.bigunits,
                facs: null,
                break: ['no'],
                '/': null,
            }
        },
        space: {
            attrs: {
                quantity: null,
                rend: ['overline','dash'],
                type: ['vacat'],
                '/': null,
            }
        },
        g: {
            attrs: {
                ref: ['#pcl','#pcs','#ra_r_kal','#kompu','#tēti','#mācam','#varuṣam','#pattu','#nūṟu','#āyiram','#patru','#eduppu','#mēṟpaṭi','#rupai','#niluvai','#varuṣam','#muthal','#muthaliya','#vakaiyaraa','#end_of_text','#latin_cross','#headmark','#headmark_with_headstroke','#bhale','#bhale_hook','#bhale_five','#bhale_nine','#bhale_nine_reversed','#mindu','#jain_omkara','#sirorekha','#puspika','#broken_danda','#danda_with_slash'],
                rend: definitions.entityrend,
            },
        },
        
        // Text emendations

        add: {
            attrs: {
                rend: ['caret','above','below'],
                place: attrs.place,
            },
            children: ['unclear'],
        },
        choice: {
            children: ['unclear','sic','corr']
        },
        del: {
            attrs: {
                rend: ['implied','overline','overwritten','strikethrough','scribble','underline'],
            },
            children: ['gap','unclear']
        },
        subst: {
            attrs: {
                rend: ['arrow','caret','kākapāda'],
            },
            children: ['add','del']
        },
        hi: {
            attrs: {
                rend: ['bold','italic','superscript','subscript'],
            },
        },

        // Difficult or missing text
        unclear: {
            attrs: {
                reason: definitions.unclear
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
                reason: ['ellipsis','lost','illegible'],
                unit: attrs.units,
                quantity: null,
            },
        },
        
        // editorial

        num: {
            attrs: {
                rend: ['traditional']
            }
        },
        supplied: {
            attrs: {
                reason: ['lost','omitted'],
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
                'function': [...definitions.segtype,...definitions.additiontype],
                'rend': ['grantha'],
                'type': ['root-text','commentary'],
                'cert': ['low']
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
                'xml:lang': attrs.langs,
                'met': ['anuṣṭubh','triṣṭubh']
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
        foreign: {
            attrs: {
                'xml:lang': attrs.langs,
            },
        },
        note: {
            attrs: {
                'xml:lang': attrs.langs,
                place: attrs.place,
            },
            children: ['c','locus','title','emph','term','lb','q'],
        },
        c: {
            attrs: {
                type: ['anchor']
            }
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
                'rend': ['bold','italic','underline','small-caps'],
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
            children: [...schemae.transcription,...schemae.names],
        },

        quote: {
            attrs: {
                'xml:lang': attrs.langs,
                'rend': ['block']
            },
            children: [...schemae.transcription,...schemae.names],
        },
        stamp : {
            attrs: {
                'xml:lang': attrs.langs
            },
            children: ['emph',...schemae.names]
        },

        watermark: {
            attrs: null,
            children: null,
        },
        // names
        
        persName: {
            attrs: {
                'xml:lang': attrs.langs,
                'role': definitions.persroles,
                'cert': ['low'],
                'key': null
            },
        },
        orgName: {
            attrs: {
                'xml:lang': attrs.langs,
                'key': null,
            },
        },
        geogName: {
            attrs: {
                'xml:lang': attrs.langs,
                'key': null,
            },
        },
        placeName: {
            attrs: {
                'xml:lang': attrs.langs,
                'key': null
            },
        },
    };
    return tags;
};

export { init };
