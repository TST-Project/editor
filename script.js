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

(function() {
    'use strict';
    const state = {
        multiselect: [],
        cmirror: [],
        filename: '',
        xmlDoc: null,
        xStyle: null,
        xSheet: 'tei-to-html.xml',
        template: 'tst-template.xml',
        toplevel: 'teiHeader',
        savedtext: new Map(),
        curlang: 'en',
    };

    const lf = window.localforage || null;
    const vanillaSelectBox = window.vanillaSelectBox || null;
    const FileSaver = window.FileSaver || null;
    const CodeMirror = window.CodeMirror || null;
    const he = window.he || null;
    const Sanscript = window.Sanscript || null;

    const init = function() {
        lf.length().then(n => {if(n>0) autosaved.fill();});
        document.getElementById('file').addEventListener('change',file.select,false);
        document.getElementById('newfile').addEventListener('click',file.startnew);
        document.body.addEventListener('click',events.bodyClick);
        document.getElementById('headerviewer').addEventListener('mouseover',events.bodyMouseover);
    };
    
    const events = {
        bodyClick: function(e) {
            switch(e.target.id) {
            case 'updateheader':
                e.preventDefault();
                editor.update();
                return;
            case 'cancelheader':
                e.preventDefault();
                editor.destroy();
                return;
            case 'editbutton':
                e.preventDefault();
                editor.init();
                return;
            case 'saveas':
                e.preventDefault();
                file.saveAs();
                return;
            case 'transbutton':
                script.transClick(e);
                return;
            default:
                break;
            }
            
            if(e.target.classList.contains('plusbutton')) {
                editor.addMultiItem(e.target);
            }
            else if(e.target.classList.contains('multi-kill')) {
                editor.killMultiItem(e.target);
            }
        },
        bodyMouseover: function(e) {
            var targ = e.target.closest('[data-anno]');
            while(targ && targ.hasAttribute('data-anno')) {
                toolTip.make(e,targ);
                targ = targ.parentNode;
            }
        },
    };

    const toolTip = {
        make: function(e,targ) {
            const toolText = targ.dataset.anno;
            if(!toolText) return;

            var tBox = document.getElementById('tooltip');
            const tBoxDiv = document.createElement('div');

            if(tBox) {
                for(const kid of tBox.childNodes) {
                    if(kid.myTarget === targ)
                        return;
                }
                tBoxDiv.appendChild(document.createElement('hr'));
            }
            else {
                tBox = document.createElement('div');
                tBox.id = 'tooltip';
                tBox.style.top = (e.clientY + 10) + 'px';
                tBox.style.left = e.clientX + 'px';
                tBox.style.opacity = 0;
                tBox.style.transition = 'opacity 0.2s ease-in';
                document.body.appendChild(tBox);
                tBoxDiv.myTarget = targ;
            }

            tBoxDiv.appendChild(document.createTextNode(toolText));
            tBoxDiv.myTarget = targ;
            tBox.appendChild(tBoxDiv);
            targ.addEventListener('mouseleave',toolTip.remove,{once: true});
            window.getComputedStyle(tBox).opacity;
            tBox.style.opacity = 1;
        },
        remove: function(e) {
            const tBox = document.getElementById('tooltip');
            if(tBox.children.length === 1) {
                tBox.remove();
                return;
            }

            const targ = e.target;
            for(const kid of tBox.childNodes) {
                if(kid.myTarget === targ) {
                    kid.remove();
                    break;
                }
            }
            if(tBox.children.length === 1) {
                const kid = tBox.firstChild.firstChild;
                if(kid.tagName === 'HR')
                    kid.remove();
            }
        },
    };

    const file = {
        parse: function(func,e) {
            state.xmlDoc = xml.parseString(e.target.result);
            func(state.xmlDoc);
        },
        render: function(xstr) {
            document.getElementById('headereditor').style.display = 'none';
            if(!state.xStyle)
                state.xStyle = file.syncLoad(state.xSheet);
            const result = xml.XSLTransform(state.xStyle,xstr);
            const body = document.querySelector('#headerviewer');
            dom.clearEl(body);
            body.appendChild(result.querySelector('.record-fat'));
            body.style.display = 'block';
            script.init();
        },
        saveAs: function() {
            const s = new XMLSerializer();
            const serialized = s.serializeToString(state.xmlDoc);
            const file = new Blob([serialized], {type: 'text/xml;charset=utf-8'});
            const fileURL = state.filename.match(/^\[.+\]$/) ?
                state.filename.replace(/^\[(.+)\]$/,'$1.xml').replace(/\s+/,'_') :
                state.filename;
            FileSaver(file,fileURL);
        },

        select: function(e) {
            document.getElementById('openform').style.display = 'none';
            const f = e.target.files[0];
            state.filename = f.name;
            const reader = new FileReader();
            reader.onload = file.parse.bind(null,editor.init.bind(null,false));
            reader.readAsText(f);
        },
        startnew: function() {
            document.getElementById('openform').style.display = 'none';
            state.filename = '[new file]';
            state.xmlDoc = file.syncLoad(state.template);
            //file.render(state.xmlDoc);
            editor.init();
        },
        syncLoad: function(fname) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET',fname,false);
            xhr.send(null);
            return xhr.responseXML;
        },
    };
    
    const editor = {
        addMultiItem: function(button) {
            const par = button.parentNode;
            const ret = button.myItem.cloneNode(true);
            par.insertBefore(ret,button);
            
            for(const m of ret.querySelectorAll('.multiselect'))
                editor.makeMultiselect(m);
            
            for(const t of ret.querySelectorAll('textarea'))
                state.cmirror.push(editor.codeMirrorInit(t));

            const dependentsel = [...state.heditor.querySelectorAll('[data-from]')].map(
                el => el.dataset.from
            );
            for(const s of new Set(dependentsel)) editor.prepUpdate(s,ret);

            return ret;
        },
        destroy: function() {
            file.render(state.xmlDoc);
        },
        fillFormField: function(field,toplevel,unsanitize) {
            const tounsanitize = unsanitize || field.tagName !== 'TEXTAREA';
            const selector = field.dataset.select || field.dataset.multiSelect;
            const xmlEl = (selector && selector !== ':scope') ?
                toplevel.querySelector(selector) :
                toplevel;
            const attr = field.dataset.attr || field.dataset.multiAttr;
            const prefix = field.dataset.prefix;

            if(!xmlEl) return;

            if(!attr) {
                field.value = tounsanitize ?
                    xml.unsanitize(xmlEl.innerHTML) :
                    xml.innerXML(xmlEl);
                //  document.importNode(xmlEl,true).innerHTML.trim();
                return;
            }

            // is attribute
            const vv = xmlEl.getAttribute(attr);
            const value = vv ? (tounsanitize ? xml.unsanitize(vv,true).trim() : vv.trim()) : '';
            if(value === '' && !prefix) return;
            
            if(field.tagName === 'SELECT') {
                const split = field.multiple ?
                    value.split(' ') : [value];    
                const selected = prefix ?
                    split.map(s => s.replace(new RegExp('^'+prefix),'')) :
                    split;
                for(const s of selected) {
                    const opt = field.querySelector(`option[value='${CSS.escape(s)}']`);
                    if(opt) opt.selected = true;
                    else {
                        const newopt = document.createElement('option');
                        newopt.setAttribute('value',s);
                        newopt.appendChild(document.createTextNode(s));
                        newopt.selected = true;
                        field.appendChild(newopt);
                    }
                }
            }
            else {
                field.value = prefix ? 
                    value.replace(new RegExp('^'+prefix),'') :
                    value;
            }
        },

        hideEmpty: function() {
            const list = [...state.heditor.querySelectorAll('.multi-item')];
            const removelist = list.filter(m => {
                for(const f of m.querySelectorAll('input,select,textarea')) {
                    if(f.required) return false;
                    else if(f.value) return false;
                    else {
                        const opts = f.querySelectorAll('option');
                        for(const o of opts)
                            if(o.selected && !o.disabled) return false;
                    }
                }
                return true;
            });
            for(const r of removelist) r.remove();
        },

        killMultiItem: function(button) {
            const multiItem = button.closest('.multi-item');
            if(window.confirm('Do you want to delete this item?')) {
                multiItem.remove();
                const dependentsel = [...state.heditor.querySelectorAll('[data-from]')].map(
                    el => el.dataset.from
                );
                for(const s of new Set(dependentsel)) editor.updateOptions(s);
            }
        },
        
        makeKillButton: function() {
            const killbutton = dom.makeEl('button');
            killbutton.type = 'button';
            killbutton.classList.add('multi-kill');
            killbutton.appendChild(document.createTextNode('X'));
            return killbutton;
        },

        makeMultiselect: function(el) {
            el.id = 'box' + Math.random().toString(36).substr(2,9);
            const mbox = new vanillaSelectBox(`#${el.id}`,{placeHolder: 'Choose...',disableSelectAll: true});
            mbox.setValue(
                [...el.querySelectorAll('option')].filter(o => o.selected).map(o => o.value)
            );
            mbox.origEl = el;
            state.multiselect.push(mbox);
        },

        init: function(unsanitize) {

            document.getElementById('headerviewer').style.display = 'none';
            
            const heditor = document.getElementById('headereditor');
            state.heditor = heditor;
            heditor.style.display = 'flex';
            
            const fields = heditor.querySelectorAll('[data-select]');
            const toplevel = state.xmlDoc.querySelector(state.toplevel);
            
            for(const field of fields) {
                if(field.classList.contains('multiple')) {
                    
                    if(!field.hasOwnProperty('myItem')) {
                        field.myItem = field.removeChild(field.querySelector('.multi-item'));
                        const killbutton = editor.makeKillButton();
                        field.myItem.insertBefore(killbutton,field.myItem.firstChild);
                    }

                    while(field.firstChild) field.firstChild.remove();

                    const els = state.xmlDoc.querySelectorAll(field.dataset.select);
                    for(const el of els) {
                        const newitem = field.myItem.cloneNode(true);
                        const subfields = newitem.querySelectorAll('input,textarea,select');
                        for(const subfield of subfields) 
                            editor.fillFormField(subfield,el,unsanitize);
                        field.appendChild(newitem);
                    }
                    field.appendChild(dom.makePlusButton(field.myItem));
                }
                else editor.fillFormField(field,toplevel,unsanitize);
            }
            
            const dependentsel = [...heditor.querySelectorAll('[data-from]')].map(el => el.dataset.from);
            editor.hideEmpty();

            for(const s of new Set(dependentsel)) {
                editor.prepUpdate(s);
                editor.updateOptions(s);
            }
            
            for(const m of heditor.querySelectorAll('.multiselect'))
                editor.makeMultiselect(m);
           
            for(const t of heditor.querySelectorAll('textarea'))
                state.cmirror.push(editor.codeMirrorInit(t));

            heditor.querySelector('#hd_publisher').value = 'TST Project';
            heditor.querySelector('#hd_publish_date').value = new Date().getFullYear();

            state.saveInterval = window.setInterval(autosaved.save,300000);
        },

        checkInvalid: function() {
            const allfields = state.heditor.querySelectorAll('input,select,textarea');
            for(const field of allfields) {
                if(!field.validity.valid) {
                    if(field.nextElementSibling && field.nextElementSibling.classList.contains('CodeMirror')) {
                        if(field.classList.contains('CodeMirror-required'))
                            return field;
                    }
                    else
                        return field;
                }
            }
            return state.heditor.querySelector('.CodeMirror-required,.cm-error,.CodeMirror-lint-mark-error') || state.heditor.querySelector('.CodeMirror-lint-marker-error,.CodeMirror-lint-marker-warning');
        },

        codeMirrorInit: function(textarea) {
            const getSchema = function(s) {
                const schemae = {
                    transcription: ['milestone','lb','pb','add','del','subst','space','unclear','gap', 'damage','supplied'], 
                    descriptive: ['term','note','emph', 'title','locus','material','ref'],
                    names: ['persName','orgName','geogName'],
                };
                const langs = ['ta','ta-Taml','en','fr','pt','pi','sa'];
                const selected = s ? 
                    s.split(' ').map(str => schemae[str]) : 
                    schemae.values();
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
                        children: ['unclear','space'],
                    },
                    subst: {
                        attrs: {
                            rend: ['arrow','caret','kākapāda'],
                        },
                        children: ['add','del'],
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
                            unit: ['akṣara'],
                            quantity: null,
                        },
                        children: ['supplied'],
                    },
                    supplied: {
                    },
                    gap: {
                        attrs: {
                            reason: ['illegible','damaged'],
                            unit: ['akṣara'],
                            quantity: null,
                        },
                    },

                    // descriptive
                    term: {
                        attrs: {
                            'xml:lang': langs,
                        },
                    },
                    note: {
                        attrs: {
                            'xml:lang': langs,
                        },
                        children: ['locus','title','emph','term'],
                    },
                    title: {
                        attrs: {
                            'xml:lang': langs,
                        },
                        children: ['emph'],
                    },
                    emph: {
                        attrs: {
                            'rend': ['bold','italic'],
                            'xml:lang': langs,
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
                            'xml:lang': langs,
                        },
                    },
                    
                    ref: {
                        attrs: {
                            'target': null,
                        },
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
                cm.setSize(null,`${textarea.rows * 2.1}rem`);
            //cm.performLint();
            return cm;
        },
        
        update: function() {
            const invalid = editor.checkInvalid();
            if(invalid) {
                invalid.scrollIntoView({behavior: 'smooth', block: 'center'});
                if(invalid.validity && !invalid.validity.valid)
                    alert(`Missing or incomplete ${invalid.name || 'field'}`);
                else {
                    const txt = invalid.textContent;
                    if(txt.trim() != '')
                        alert(`XML error: '${txt}'`);
                    else alert('XML error');
                }
                return;
            }
            
            while(state.multiselect.length > 0) {
                const el = state.multiselect.pop();
                if(el) el.destroy();
            }
            while(state.cmirror.length > 0) state.cmirror.pop().toTextArea();
            
            const toplevel = editor.updateFields(state.xmlDoc);
            
            editor.postProcess(toplevel);
            file.render(state.xmlDoc);
            autosaved.save();
        },

        updateFields(doc,sanitized) {
            const fields = state.heditor.querySelectorAll('[data-select]');
            const toplevel = doc.querySelector(state.toplevel);
            for(const field of fields) {
                if(field.classList.contains('multiple')) {
                    xml.clearAllEls(field.dataset.select,toplevel);
                    const items = field.querySelectorAll('.multi-item');
                    for(const item of items) {
                        const newXml = xml.makeElDeep(field.dataset.select,toplevel,true);
                        const subfields = item.querySelectorAll('[data-multi-select],[data-multi-attr]');
                        for(const subfield of subfields) 
                            editor.updateXMLField(subfield,newXml,sanitized);
                    }
                }
                else editor.updateXMLField(field,toplevel,sanitized);
            }
            return toplevel;
        },

        postProcess: function(toplevel) {
            //update editionStmt
            const par = toplevel || state.xmlDoc;
            const editionStmt = par.querySelector('fileDesc > editionStmt > p');
            if(editionStmt) {
                const persName = editionStmt.removeChild(editionStmt.querySelector('persName'));
                const orgName = editionStmt.removeChild(editionStmt.querySelector('orgName'));
                while(editionStmt.firstChild) editionStmt.firstChild.remove();
                editionStmt.appendChild(state.xmlDoc.createTextNode('Record edited by '));
                editionStmt.appendChild(persName);
                editionStmt.appendChild(state.xmlDoc.createTextNode(' '));
                editionStmt.appendChild(orgName);
                editionStmt.appendChild(state.xmlDoc.createTextNode('.'));
            }
        },

        prepUpdate: function(sel,par) {
            const t = par || state.heditor;
            const field = t.querySelectorAll(`[name=${sel}]`);
            for(const f of field)
                f.addEventListener('blur',function() {editor.updateOptions(sel);});
        },
        
        updateOptions: function(sel) {
            const options = [...state.heditor.querySelectorAll(`[name=${sel}]`)].map(el => {
                const opt = document.createElement('option');
                opt.setAttribute('value',el.value);
                opt.appendChild(document.createTextNode(el.value));
                return opt;
            });
            const selects = state.heditor.querySelectorAll(`select[data-from=${sel}]`);
            for(const select of selects) {
                const selected = [...select.querySelectorAll('option:checked')].map(
                    el => el.value
                );
                while(select.firstChild) select.removeChild(select.firstChild);
                for(const o of options) {
                    const oclone = o.cloneNode(true);
                    if(selected.indexOf(oclone.value) !== -1) oclone.selected = true;
                    select.appendChild(oclone);
                }
                if(select.multiple) {
                    const mbox = (function(){
                        for(const m of state.multiselect)
                            if(m && m.origEl === select) return m;
                    }());
                    if(mbox) {
                        mbox.destroy();
                        delete state.multiselect[state.multiselect.indexOf(mbox)];
                        editor.makeMultiselect(select);
                    }
                }
            }
        },
        updateXMLField: function(field,toplevel,sanitized) {
            const tosanitize = sanitized || field.tagName !== 'TEXTAREA' || false;
            let value = field.type === 'text' ? 
                field.value.trim() : 
                field.value;
            const selector = field.dataset.select || field.dataset.multiSelect;
            let xmlEl = (selector && selector !== ':scope') ?
                toplevel.querySelector(selector) :
                toplevel;
            const attr = field.dataset.attr || field.dataset.multiAttr;
            const prefix = field.dataset.prefix;

            const valtrim = value.trim();
            if(!valtrim) {
                if(!xmlEl) return;
                else {
                    if(attr)
                        xmlEl.setAttribute(attr,'');
                    else
                        xmlEl.innerHTML = '';
                    return;
                }
            }
            if(!xmlEl) xmlEl = xml.makeElDeep(selector,toplevel);
            if(field.multiple) {
                const selected = [];
                for(const opt of field.querySelectorAll('option'))
                    if(opt.selected) selected.push(opt.value);
                value = selected.join(' ');
            }

            if(prefix) 
                value = prefix + value;
            if(attr) {
                //tosanitize ? 
                //    xmlEl.setAttribute(attr,xml.sanitize(value)) :
                // no need to sanitize attributes
                xmlEl.setAttribute(attr,value);
            }
            else {
                tosanitize ? 
                    xmlEl.innerHTML = xml.sanitize(value) : 
                    xmlEl.innerHTML = value;
            }
            return true;
        },
    };

    const xml = {
        parseString: function(str) {
            const parser = new DOMParser();
            const newd = parser.parseFromString(str,'text/xml');
            if(newd.documentElement.nodeName === 'parsererror')
                alert('XML errors');
            else
                return newd;
        },
        innerXML: function(el) {
            const s = new XMLSerializer();
            const empty = el.cloneNode();
            empty.innerHTML = '\u{FFFFD}';
            const str = s.serializeToString(el);
            const emptystr = s.serializeToString(empty);
            const [starttag,endtag] = emptystr.split('\u{FFFFD}');
            return str.slice(starttag.length).slice(0,-endtag.length);
        },
        unsanitize: function(str,attr) {
            return attr ?
                he.unescape(str,{isAttributeValue: true}) :
                he.unescape(str);
        },
        sanitize: function(str) {
            return he.escape(str);
        },
        XSLTransform: function(xslsheet,doc) {
            const xproc = new XSLTProcessor();
            xproc.importStylesheet(xslsheet);
            return xproc.transformToDocument(doc);
        },
    
        clearEl: function(path,toplevel) {
            const par = toplevel || state.xmlDoc;
            const el = par.querySelector(path);
            if(el) el.remove();
        },
        clearAllEls: function(path,toplevel) {
            const els = toplevel.querySelectorAll(path);
            for(const el of els)
                el.remove();
        },
        makeElDeep: function(path,toplevel,duplicate) {
            const thisdoc = toplevel.ownerDocument;
            const ns = thisdoc.documentElement.namespaceURI;
            const children = path.split(/\s*>\s*/g).filter(x => x);
            const last = duplicate ?
                children.pop() :
                null;

            const makeNewChild = function(path,par) {
                const childsplit = path.split('[');
                const new_child = thisdoc.createElementNS(ns,childsplit[0]);
                par.appendChild(new_child);
                if(childsplit.length > 1) { // add attribute
                    const attrsplit = childsplit[1].split('=');
                    const attr = attrsplit[0];
                    const val = attrsplit[1].replace(/[\]''""]/g,'');
                    new_child.setAttribute(attr,val);
                }
                return new_child;
            };
            
            let par_el = toplevel;
            for(const child of children) {
                const child_el = par_el.querySelector(child);
                if(!child_el) {
                    par_el = makeNewChild(child,par_el);
                }
                else par_el = child_el;
            }
            return duplicate ?
                makeNewChild(last,par_el) :
                par_el;
        },
    };

    const autosaved = {
        fill: function() {
            const box = document.getElementById('autosavebox');
            box.style.display = 'flex';
            lf.keys().then(ks => {
                for(const k of ks) {
                    const newel = dom.makeEl('div');
                    newel.classList.add('autosaved');
                    newel.appendChild(document.createTextNode(k));
                    newel.dataset.storageKey = k;
                    const trashasset = document.querySelector('#assets #trash');
                    const trash = dom.makeEl('span');
                    trash.classList.add('trash');
                    trash.appendChild(trashasset.cloneNode(true));
                    trash.height = 20;
                    newel.appendChild(trash);
                    newel.addEventListener('click',autosaved.load.bind(null,k));
                    trash.addEventListener('click',autosaved.remove.bind(null,k));
                    box.appendChild(newel);
                }
            });
        },

        load: function(k,e) {
            if(e.target.closest('.trash'))
                return;
            lf.getItem(k).then(i => {
                document.getElementById('openform').style.display = 'none';
                file.parse(editor.init.bind(null,true),{target: {result: i}});
                state.filename = k;
            });
        },

        remove: function(k) {
            lf.removeItem(k);
            document.querySelector(`#autosavebox .autosaved[data-storage-key='${k}']`).remove();
        },
        save: function() {
            const docclone = state.xmlDoc.cloneNode(true);
            /*
            while(state.multiselect.length > 0) {
                const el = state.multiselect.pop();
                if(el) el.destroy();
            }
            while(state.cmirror.length > 0) state.cmirror.pop().toTextArea();
            */
            for(const cm of state.cmirror)
                if(cm) cm.getTextArea().value = cm.getValue();
            for(const mb of state.multiselect) {
                if(!mb) continue;
                const vsbid = `btn-group-#${mb.origEl.id}`;
                const selected = document.getElementById(vsbid).querySelectorAll('li.active');
                for(const s of selected) {
                    const o = mb.origEl.querySelector(`option[value='${CSS.escape(s.dataset.value)}']`);
                    if(o) o.selected = true;
                }
            }
            editor.updateFields(docclone,true);
            //editor.postProcess(toplevel);
           
            if(state.filename === '[new file]') {
                const cote = docclone.querySelector('idno[type="cote"]');
                if(cote && cote.textContent !== '')
                    state.filename = `[${cote.textContent}]`;
            }
            
            const s = new XMLSerializer();
            lf.setItem(state.filename,s.serializeToString(docclone));
        },
    }; // end autosaved
    
    const dom = {
        clearEl: function(el) {
            while(el.firstChild)
                el.removeChild(el.firstChild);
        },
        makeEl: function(name,doc) {
            const d = doc ? doc : document;
            return d.createElement(name);
        },
        makePlusButton: function(el) {
            const button = dom.makeEl('div');
            const emptyel = el.cloneNode(true);
            for(const i of emptyel.querySelectorAll('input,textarea')) {
                i.value = '';
            }
            for(const o of emptyel.querySelectorAll('option')) {
                o.selected = false;
            }

            button.classList.add('plusbutton');
            button.appendChild(document.createTextNode('+'));
            button.title = 'Add new section';
            button.myItem = emptyel;
            return button;
        },
    };

    const script = {
        init: function() {
            const r = document.getElementById('headerviewer');
            if(!r.lang) r.lang = 'eng';
            state.savedtext = new Map();
            state.curlang = 'eng';

            const walker = document.createTreeWalker(r,NodeFilter.SHOW_ALL);
            var curnode = walker.currentNode;
            while(curnode) {
                if(curnode.nodeType === Node.ELEMENT_NODE) {
                    if(!curnode.lang) curnode.lang = curnode.parentNode.lang;
                }
                else if(curnode.nodeType === Node.TEXT_NODE) {
                    const curlang = curnode.parentNode.lang;
                    if(curlang === 'tam' || curlang === 'tam-Taml')
                        curnode.data = script.cacheText(curnode);
                }
                curnode = walker.nextNode();
            }
        },
        cacheText: function(txtnode) {
            const lang = txtnode.parentNode.lang;
            const hyphenlang = lang === 'tam-Taml' ? 'ta' : 'sa';
            const hyphenated = window['Hypher']['languages'][hyphenlang].hyphenateText(txtnode.data);
            state.savedtext.set(txtnode,hyphenated);
            if(lang === 'tam-Taml')
                return script.to.iast(hyphenated);
            else return hyphenated;
        },

        transClick: function(e) {
            if(state.curlang === 'tam') {
                const tamnodes = document.querySelectorAll('[lang="tam"],[lang="tam-Taml"]');
                for(const t of tamnodes) t.classList.remove('tamil');
                script.textWalk(script.toRoman);
                e.target.innerHTML = 'A';
                e.target.classList.remove('tamil');
                state.curlang = 'eng';
            }
            else {
                const tamnodes = document.querySelectorAll('[lang="tam"],[lang="tam-Taml"]');
                for(const t of tamnodes) t.classList.add('tamil');
                script.textWalk(script.toTamil);
                e.target.innerHTML = 'அ';
                e.target.classList.add('tamil');
                state.curlang = 'tam';
            }
        },
    
        textWalk: function(func) {
            const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
            var curnode = walker.currentNode;
            while(curnode) {
                if(curnode.parentNode.lang === 'tam' || curnode.parentNode.lang === 'tam-Taml') {
                    const result = func(curnode);
                    if(result) curnode.data = result;
                }
                curnode = walker.nextNode();
            }
        },
    
        toTamil: function(txtnode) {
            if(txtnode.parentNode.lang === 'tam')
                return script.to.tamil(txtnode.data);
            else
                return state.savedtext.get(txtnode);
        },

        toRoman: function(txtnode) {
            if(txtnode.parentNode.lang === 'tam')
                return state.savedtext.get(txtnode);
            else if(txtnode.parentNode.lang === 'tam-Taml')
                return script.to.iast(txtnode.data);
        },

        to: {

            smush: function(text,placeholder) {
                text = text.toLowerCase();
            
                // remove space between a word that ends in a consonant and a word that begins with a vowel
                text = text.replace(/([ḍdrmvynhs]) ([aāiīuūṛeoêô])/g, '$1$2'+placeholder);
            
                // remove space between a word that ends in a consonant and a word that begins with a consonant
                text = text.replace(/([kgcjñḍtdnpbmrlyvśṣsṙ]) ([kgcjṭḍtdnpbmyrlvśṣshḻ])/g, '$1'+placeholder+'$2');

                // join final o/e/ā and avagraha/anusvāra
                text = text.replace(/([oōeēā]) ([ṃ'])/g,'$1'+placeholder+'$2');

                text = text.replace(/ü/g,'\u200Cu');
                text = text.replace(/ï/g,'\u200Ci');

                text = text.replace(/_{1,2}(?=\s*)/g, function(match) {
                    if(match === '__') return '\u200D';
                    else if(match === '_') return '\u200C';
                });

                return text;
            },

            iast: function(text,from) {
                const f = from || 'tamil';
                return Sanscript.t(text,f,'iast').replace(/^⁰|([^\d⁰])⁰/g,'$1¹⁰');
            },
            
            tamil: function(text/*,placeholder*/) {
                /*const pl = placeholder || '';
                const txt = to.smush(text,pl);
                return Sanscript.t(txt,'iast','tamil');*/
                const grv = new Map([
                    ['\u0B82','\u{11300}'],
                    ['\u0BBE','\u{1133E}'],
                    ['\u0BBF','\u{1133F}'],
                    ['\u0BC0','\u{11340}'],
                    ['\u0BC2','\u{11341}'],
                    ['\u0BC6','\u{11342}'],
                    ['\u0BC7','\u{11347}'],
                    ['\u0BC8','\u{11348}'],
                    ['\u0BCA','\u{1134B}'],
                    ['\u0BCB','\u{1134B}'],
                    ['\u0BCC','\u{1134C}'],
                    ['\u0BCD','\u{1134D}'],
                    ['\u0BD7','\u{11357}']
                ]);
                const grc = ['\u{11316}','\u{11317}','\u{11318}','\u{1131B}','\u{1131D}','\u{11320}','\u{11321}','\u{11322}','\u{11325}','\u{11326}','\u{11327}','\u{1132B}','\u{1132C}','\u{1132D}'];

                const smushed = text.replace(/([kṅcñṭṇtnpmyrlvḻḷṟṉ])\s+([aāiīuūeēoō])/g, '$1$2').toLowerCase();
                const rgex = new RegExp(`([${grc.join('')}])([${[...grv.keys()].join('')}])`,'g');
                const pretext = Sanscript.t(smushed,'iast','tamil');
                return pretext.replace(rgex, function(m,p1,p2) {
                    return p1+grv.get(p2); 
                });
            },
        }
    };
    window.addEventListener('load',init);
}());
