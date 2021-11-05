(function() {
    'use strict';
    const state = {
        multiselect: [],
        cmirror: [],
        filename: '',
        xmlDoc: null,
        xStyle: null,
        xDefinitions: null,
        xSheet: 'tei-to-html.xsl',
        template: 'tst-template.xml',
        definitions: '../lib/xslt/definitions.xs',
        toplevel: 'TEI',
        savedtext: new Map(),
        saveInterval: null,
        autosaveprefix: '',
    };

    const lf = window.localforage || null;
    const vanillaSelectBox = window.vanillaSelectBox || null;
    const FileSaver = window.FileSaver || null;
    const cmWrapper = window.cmWrapper || null;
    const he = window.he || null;
    const Mirador = window.Mirador || null;

    const init = () => {
        lf.length().then(n => {if(n>0) autosaved.fill();});
        document.getElementById('file').addEventListener('change',file.select,false);
        document.getElementById('newfile').addEventListener('click',file.startnew);
        document.body.addEventListener('click',events.bodyClick);
        document.getElementById('headerviewer').addEventListener('mouseover',events.bodyMouseover);
    };
    
    const events = {
        bodyClick(e) {
            switch(e.target.id) {
            case 'updateheader':
                e.preventDefault();
                editor.apply.update();
                return;
            /*
            case 'cancelheader':
                e.preventDefault();
                editor.destroy();
                return;
            */
            case 'editbutton':
                e.preventDefault();
                editor.init();
                return;
            case 'saveas':
                e.preventDefault();
                file.saveAs();
                return;
            case 'savedraft':
                e.preventDefault();
                autosaved.save(true);
                return;
            default:
                break;
            }
            
            if(e.target.closest('.plusbutton')) {
                editor.multiItem.add(e.target);
            }
            else if(e.target.closest('.multi-kill')) {
                editor.multiItem.kill(e.target);
            }
            else if(e.target.closest('.multi-up')) {
                editor.multiItem.up(e.target);
            }
            else if(e.target.closest('.multi-down')) {
                editor.multiItem.down(e.target);
            }
        },
        bodyMouseover(e) {
            var targ = e.target.closest('[data-anno]');
            while(targ && targ.hasAttribute('data-anno')) {
                toolTip.make(e,targ);
                targ = targ.parentNode;
            }
        },
        tipShow(e) {
            const el = e.target;
            const tiptxt = el.dataset.tip;
            const tipel = document.createElement('span');
            tipel.classList.add('marginnote');
            tipel.id = 'margintip';
            tipel.style.position = 'absolute';
            tipel.style.paddingLeft = '2rem';
            tipel.style.width = '300px';
            tipel.append(tiptxt);

            const section = state.heditor.querySelector('section');
            var y = 0;
            var par = el;
            while(par && par !== state.heditor && !isNaN(par.offsetTop)) {
                y += par.offsetTop;
                par = par.offsetParent;
            }
            const x = section.getBoundingClientRect().right;
            tipel.style.top = y + 'px';
            tipel.style.left = x + 'px';
            state.heditor.appendChild(tipel);
            el.myMarginnote = tipel;
        },
        tipRemove() {
            const el = document.getElementById('margintip');
            if(el) el.remove();
        },
        tocClick(e) {
            const li = e.target.closest('li');
            if(!li) return;

            const href = li.querySelector('a').href.split('#').pop();
            if(href === 'top') {
                state.heditor.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            else {
                const el = document.getElementById(href);
                el.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
            e.preventDefault();
        },
        
        tocUpdate() {
            
            const light = (id) => {
                const el = state.toc.get(id);
                if(!el.classList.contains('current')) {
                    const cur = (() => {
                        for(const t of state.toc.values()) {
                            if(t.classList.contains('current')) return t;
                        }
                        return null;
                    })();
                    if(cur) cur.classList.remove('current');
                    el.classList.add('current');
                }
            };

            const go = () => {
                for(const h of state.headers) {
                    const scrollpos = window.innerHeight/2;
                    if(h.getBoundingClientRect().top <= scrollpos) {
                        light(h.id);
                        return;
                    }
                }
                light('top');
            };

            clearTimeout(state.scrollTimeout);
            state.scrollTimeout = setTimeout(go,200);
        },
        /*
        tocUpdate(entries,observer) {
            const light = (id) => {
                const el = state.toc.get(id);
                if(!el.classList.contains('current')) {
                    const cur = (() => {
                        for(const t of state.toc.values()) {
                            if(t.classList.contains('current')) return t;
                        }
                        return null;
                    })();
                    if(cur) cur.classList.remove('current');
                    el.classList.add('current');
                }
            };
            light(entries[0].target.id);
        },
        */
    };

    const toolTip = {
        make(e,targ) {
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

            tBoxDiv.append(toolText);
            tBoxDiv.myTarget = targ;
            tBox.appendChild(tBoxDiv);
            targ.addEventListener('mouseleave',toolTip.remove,{once: true, passive: true});
            window.getComputedStyle(tBox).opacity;
            tBox.style.opacity = 1;
        },
        remove(e) {
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
        parse(func,e) {
            state.xmlDoc = xml.parseString(e.target.result);
            func(state.xmlDoc);
        },
        render(xstr) {
            editor.killViewer();
            document.getElementById('headereditor').style.display = 'none';
            /*if(!state.xStyle)
                state.xStyle = file.syncLoad(state.xSheet);*/
            const go = async (xslt) => {
                if(xslt) state.xStyle = xslt;
                const result = await xml.XSLTransform(state.xStyle,xstr);
                const body = document.getElementById('headerviewer');
                
                const viewer = document.getElementById('viewer');
                const facs = result.querySelector('#viewer');
                if(facs) {
                    if(!viewer) 
                        body.appendChild(facs);
                    else
                        viewer.dataset.manifest = facs.dataset.manifest;
                }
                else {
                    if(viewer) viewer.remove();
                }

                const rec = document.getElementById('recordcontainer');
                if(rec) rec.remove();

                body.appendChild(result.querySelector('#recordcontainer'));


                body.style.display = 'flex';

                window.TSTViewer.init();
            };

            if(!state.xStyle)
                file.asyncLoad(state.xSheet,go);
            else go();
        },
        saveAs(doc,suffix = '') {
            const serialized = xml.serialize(doc || state.xmlDoc);
            const file = new Blob([serialized], {type: 'text/xml;charset=utf-8'});
            const fileURL = state.filename.match(/^\[.+\]$/) ?
                state.filename.replace(/^\[(.+)\]$/,'$1'+suffix+'.xml').replace(/\s+/,'_') :
                state.filename.replace(/\.xml/,suffix+'.xml');
            FileSaver(file,fileURL);
        },

        select(e) {
            document.getElementById('openform').style.display = 'none';
            const f = e.target.files[0];
            state.filename = f.name;
            const reader = new FileReader();
            //reader.onload = file.parse.bind(null,editor.init.bind(null,false));
            reader.onload = file.parse.bind(null,editor.init);
            reader.readAsText(f);
        },
        
        selectPart(e) {
            const f = e.target.files[0];
            const par = e.target.parentNode;
            const reader = new FileReader();
            const toplevel = state.xmlDoc.querySelector(state.toplevel);
            const parse = (par,e) => {
                const parsed = xml.parseString(e.target.result);
                if(parsed) {
                    // add header
                    const msDesc = parsed.querySelector('msDesc');
                    if(msDesc) {
                        const ns = state.xmlDoc.documentElement.namespaceURI;
                        const headEl = parsed.createElementNS(ns,'head');
                        const head = parsed.querySelector('titleStmt > title');
                        if(head) {
                            headEl.innerHTML = xml.innerXML(head);
                        }
                        else
                            headEl.textContent = 'MS part';

                        msDesc.insertBefore(headEl,msDesc.firstChild);
                        
                        const selector = par.closest('.multiple').dataset.select;

                        const newXml = xml.makeElDeep(selector,toplevel,true);
                        newXml.appendChild(msDesc);

                        const fields = par.querySelectorAll('[data-subselect]','[data-subattr]');
                        for(const field of fields)
                            editor.fill.simpleField(field,msDesc,false);
                        
                        editor.fill.fixed(par,msDesc);
                    }
                    
                    // add any transcriptions
                    const textels = parsed.querySelectorAll('text');
                    const textbutton = document.querySelector('[data-select="text"] .plusbutton');
                    for(const textel of textels) {
                        toplevel.appendChild(textel);

                        const ret = editor.multiItem.make(textbutton);
                        const fields = ret.querySelectorAll('[data-subselect],[data-subattr]');
                        for(const field of fields)
                            editor.fill.simpleField(field,textel,false);
                        
                        editor.multiItem.prep(ret);
                    }
                }
                else
                    par.querySelector('.msPart_head').textContent = 'Error importing file.';
            };
            reader.onload = parse.bind(null,par);
            reader.readAsText(f);

        },

        startnew() {
            document.getElementById('openform').style.display = 'none';
            state.filename = '[new file]';
            //state.xmlDoc = file.syncLoad(state.template);
            //file.render(state.xmlDoc);
            //editor.init();
            file.asyncLoad(state.template,(f) => {
                state.xmlDoc = f;
                editor.init();
            });
        },
        /*
        syncLoad(fname,text = false) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET',fname,false);
            xhr.send(null);
            return text ? xhr.responseText : xhr.responseXML;
        },
        */
        asyncLoad(fname,func) {
            fetch(fname).then(resp => resp.text())
                .then((str) => {
                    func(xml.parseString(str));
                });
            /*
            const xhr = new XMLHttpRequest();
            xhr.open('GET',fname,true);
            xhr.timeout = 2000;
            xhr.onload = () => {
                if(xhr.readyState === 4) {
                    if(xhr.status === 200)
                        func(xhr.responseXML);
                    else
                        alert(xhr.statusText);
                }
            };
            xhr.ontimeout = () => {alert(`Unable to load ${fname}: timed out.`);};
            xhr.onerror = () => {alert(xhr.statusText);};
            xhr.send(null);
            */
        },
    };
    
    const editor = {

        init() {
            if(!state.xDefinitions)
                file.asyncLoad('../lib/xslt/definitions.xsl', (res) => {
                    state.xDefinitions = res;
                    editor.initgo();
                });
            else editor.initgo();
        },
        initgo() {
            window.TSTViewer.killMirador();
            document.getElementById('headerviewer').style.display = 'none';

            const heditor = document.getElementById('headereditor');
            state.heditor = heditor;
            heditor.style.display = 'flex';
            
            const unsanitize = (() => {
                const f = state.xmlDoc.firstChild;
                if(f.nodeType === 7 && 
                   f.target  === 'tst' && 
                   f.data === 'sanitized="true"') {
                    f.remove();
                    return true;
                }
                return false;})();

            editor.upgrade(state.xmlDoc);

            const topopulate = heditor.querySelectorAll('[data-list]');
            editor.populate(topopulate);

            editor.fill.all(heditor,unsanitize);

            const dependentsel = [...heditor.querySelectorAll('[data-from]')].map(el => el.dataset.from);


            editor.multiItem.hideEmpty();

            for(const s of new Set(dependentsel)) {
                editor.selects.listen(s);
                editor.selects.update(s);
            }
            
            for(const m of heditor.querySelectorAll('.multiselect'))
                editor.selects.make(m);
           
            for(const t of heditor.querySelectorAll('textarea:not(.noCodeMirror)'))
                state.cmirror.push(cmWrapper.init(t));

            for(const t of heditor.querySelectorAll('[data-tip]')) {
                t.addEventListener('focus',events.tipShow,{passive: true});
                t.addEventListener('blur',events.tipRemove,{passive: true});
            }

            //heditor.querySelector('#hd_publisher').value = 'TST Project';
            heditor.querySelector('#hd_publish_date').value = new Date().getFullYear();
            
            editor.toc();
            editor.toggleViewer();
            
            heditor.querySelector('input[name="facsimile"]').addEventListener('blur',editor.toggleViewer);
            document.getElementById('viewertoggle').addEventListener('click',editor.buttonToggleViewer);
            if(!state.saveInterval) 
                state.saveInterval = window.setInterval(autosaved.save,300000);
        },
        
        toggleViewer() {
            const manif = state.heditor.querySelector('input[name="facsimile"]');
            if(manif.value && manif.checkValidity())
                editor.startViewer(manif.value);
            else
                editor.killViewer();
        },

        buttonToggleViewer(e) {
            if(e.target.textContent === '<')
                editor.killViewer(true);
            else
                editor.toggleViewer();
        },

        startViewer(manifest) {
            const start = state.heditor.querySelector('input[name="facsimile_start"]').value || 1;
            document.getElementById('editorviewer').style.display = 'block';
            state.heditor.querySelector('header').style.display = 'none';
            state.heditor.classList.add('fat');
            if(!state.editorviewer)
                state.editorviewer = window.TSTViewer.newMirador('editorviewer',manifest,start - 1);
            else {
                const act1 = Mirador.actions.fetchManifest(manifest);
                state.editorviewer.store.dispatch(act1);
                const act = Mirador.actions.addWindow( {
                    id: 'win1',
                    manifestId: manifest,
                    canvasIndex: start -1
                });
                state.editorviewer.store.dispatch(act);
            }
            const toggle = document.getElementById('viewertoggle');
            toggle.textContent = '<';
            toggle.style.display = 'flex';
        },

        killViewer(stayready) {
            if(!state.editorviewer) return;

            const viewer = document.getElementById('editorviewer');
            viewer.style.display = 'none';
            state.heditor.querySelector('header').style.display = 'block';
            state.heditor.classList.remove('fat');

            window.TSTViewer.killMirador(state.editorviewer);
            
            const toggle = document.getElementById('viewertoggle');
            if(stayready)
                toggle.textContent = '>';
            else
                toggle.style.display = 'none';
        },

        toc() {
            const header = state.heditor.querySelector('header');
            
            // TODO: don't re-create the TOC every time
            while(header.firstChild)
                header.firstChild.remove();

            const hs = state.heditor.querySelectorAll('h1,h2,h3,h4');
            const ul = document.createElement('ul');
            
            const t = document.createElement('li');
            const ta = document.createElement('a');
            ta.className = 'local';
            ta.href = '#top';
            ta.append('^Top');
            t.append(ta);
            ul.append(t);
           
            const tocmap = [['top',t]];

            for(const [i,h] of hs.entries()) {
                const n = document.createElement('li');
                const cname = `list${h.tagName.slice(-1)}`;
                n.className = cname;
                const na = document.createElement('a');
                na.className = 'local';
                if(!h.id) h.id = `toc${i}`;
                na.href = `#${h.id}`;
                na.append(h.textContent);
                n.appendChild(na);
                ul.appendChild(n);
                
                tocmap.push([h.id,n]);
            }
            header.appendChild(ul);
            header.addEventListener('click',events.tocClick);
            state.heditor.addEventListener('scroll',events.tocUpdate,{passive: true});
            /* 
            state.tocObserver = new IntersectionObserver(events.tocUpdate, {
                root: state.heditor,
                rootMargin: '-50% 0% -50% 0%',
                threshold: 0
            });
            */
            state.toc = new Map(tocmap);
            state.headers = [...hs].reverse();
            //for(const h of state.headers) state.tocObserver.observe(h);
        },

        /*
        destroy: () => {
            editor.destroyJS();
            file.render(state.xmlDoc);
        },
        */

        destroyJS() {
            while(state.multiselect.length > 0) {
                const el = state.multiselect.pop();
                if(el) el.destroy();
            }
            while(state.cmirror.length > 0) state.cmirror.pop().toTextArea();
        },

        fill: {
            all(el,unsanitize) {
                const par = el || state.heditor;

                const fields = par.querySelectorAll('[data-select]');
                const toplevel = state.xmlDoc.querySelector(state.toplevel);
                
                for(const field of fields) {
                    if(field.classList.contains('multiple')) {
                        editor.fill.multiField(field,toplevel,unsanitize);
                    }
                    else editor.fill.simpleField(field,toplevel,unsanitize);
                }
            },

            fixed(par,toplevel) {
                const fillFixedField = (field,toplevel) => {
                    const selector = field.dataset.fixedSelect;
                    const xmlEl = (selector && selector !== ':scope') ?
                        toplevel.querySelector(selector) :
                        toplevel;
                    const attr = field.dataset.fixedAttr;
                    if(!xmlEl) return;
                    if(!attr) field.textContent = xmlEl.textContent;
                    else field.textContent = xmlEl.getAttribute(attr) || '';
                };

                const fillFixedMultiField = (field,toplevel) => {
                    dom.clearEl(field);
                    const sel = field.dataset.fixedMultiselect;
                    const els = toplevel.querySelectorAll(sel);
                    const attr = field.dataset.fixedAttr;
                    const name = field.dataset.fixedName;
                    for(const el of els) {
                        const newchild = document.createElement('input');
                        newchild.name = name;
                        if(!attr)
                            newchild.value = el.textContent;
                        else
                            newchild.value = el.getAttribute(attr);
                        field.appendChild(newchild);
                    }
                    editor.selects.update(name);
                };

                for(const subfixed of par.querySelectorAll('[data-fixed-select]'))
                    fillFixedField(subfixed,toplevel);
                for(const multifixed of par.querySelectorAll('[data-fixed-multiselect]')) {
                    fillFixedMultiField(multifixed,toplevel);
                }
                const fileselector = par.querySelector('input[type="file"]');
                if(fileselector) fileselector.remove();
            },

            simpleField(field,toplevel,unsanitize) {
                const tounsanitize = unsanitize || field.tagName !== 'TEXTAREA';
                const selector = field.dataset.select || field.dataset.subselect;
                const xmlEl = (selector && selector !== ':scope') ?
                    toplevel.querySelector(selector) :
                    toplevel;
                const attr = field.dataset.attr || field.dataset.subattr;
                const prefix = field.dataset.prefix;

                if(!xmlEl) return;
                
                const getVal = (el,attr,tounsanitize) => {
                    if(!attr) {
                        return tounsanitize ?
                            xml.unsanitize(el.innerHTML) :
                            xml.innerXML(el);
                    }
                    else {
                        const vv = el.getAttribute(attr);
                        return vv ? (tounsanitize ? xml.unsanitize(vv,true).trim() : vv.trim()) : '';
                    }
                };

                const value = getVal(xmlEl,attr,tounsanitize);
                if(value === '' && !prefix) return;
                if(field.tagName !== 'SELECT') {
                    field.value = prefix ? 
                        value.replace(new RegExp('^'+prefix),'') :
                        value;
                    return;
                }
                else {
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
                            newopt.append(s);
                            newopt.selected = true;
                            field.appendChild(newopt);
                        }
                    }
                }
            },
            multiField(field,toplevel,unsanitize) {

                const plusbutton = editor.multiItem.collapse(field);

                //const els = state.xmlDoc.querySelectorAll(field.dataset.select);
                const selector = field.dataset.select || field.dataset.subselect;
                const els = toplevel.querySelectorAll(selector);
                for(const el of els) {
                    const newitem = field.myItem.cloneNode(true);

                    const subfields = editor.apply.getSubFields(newitem);
                    for(const subfield of subfields) {
                        if(subfield.classList.contains('multiple'))
                            editor.fill.multiField(subfield,el,unsanitize);
                        else
                            editor.fill.simpleField(subfield,el,unsanitize);
                    }

                    if(field.classList.contains('file')) {
                        editor.fill.fixed(newitem,el);
                    }

                    field.insertBefore(newitem,plusbutton);
                }

                editor.multiItem.updateButtonrows(field);
            },
        
        },
        
        multiItem: {
            add(button) {
                editor.multiItem.prep(
                    editor.multiItem.make(button)
                );
            },

            collapse(field) {
                if(!field.hasOwnProperty('myItem')) {
                    field.myItem = field.removeChild(field.querySelector('.multi-item'));
                    const buttonrow = editor.multiItem.makeButtonrow();
                    field.myItem.insertBefore(buttonrow,field.myItem.firstChild);
                }

                //while(field.firstChild) field.firstChild.remove();
                dom.clearEl(field);
                const b = editor.multiItem.makePlus(field.myItem);
                field.appendChild(b);
                return b;
            },
            get(par) {
                return [...par.children].filter(el => el.matches('.multi-item'));
            },

            hideEmpty(el) {
                const par = el || state.heditor;
                const list = [...par.querySelectorAll('.multi-item')];
                const removelist = list.filter(m => {
                    for(const f of m.querySelectorAll('input,select,textarea')) {
                        if(f.required) return false;
                        else if(f.value) return false;
                        else {
                            const opts = f.querySelectorAll('option');
                            for(const o of opts) {
                                if(o.selected && !o.disabled && o.value)
                                    return false;
                            }
                        }
                    }
                    return true;
                });
                for(const r of removelist) r.remove();
            },

            kill(button) {
                const multiItem = button.closest('.multi-item');
                if(window.confirm('Do you want to delete this item?')) {
                    multiItem.remove();
                    const dependentsel = [...state.heditor.querySelectorAll('[data-from]')].map(
                        el => el.dataset.from
                    );
                    for(const s of new Set(dependentsel)) editor.selects.update(s);
                }
                editor.multiItem.updateButtonrows(multiItem.closest('.multiple'));
            },

            make(button) {
                const ret = button.myItem.cloneNode(true);
                button.parentNode.insertBefore(ret,button);
                return ret;
            },

            prep(ret) {

                for(const m of ret.querySelectorAll('.multiple')) {
                    if(!m) continue;
                    editor.multiItem.collapse(m);
                }

                const topopulate = ret.querySelectorAll('[data-list]');
                editor.populate(topopulate,state.xDefinitions);

                for(const m of ret.querySelectorAll('.multiselect'))
                    editor.selects.make(m);
                
                for(const t of ret.querySelectorAll('textarea:not(.noCodeMirror)'))
                    state.cmirror.push(cmWrapper.init(t));

                const dependentsel = new Set(
                    [...state.heditor.querySelectorAll('[data-from]')].map(
                        el => el.dataset.from
                    )
                );
                for(const s of dependentsel) {
                    editor.selects.listen(s,ret);
                    editor.selects.update(s);
                }

                for(const f of ret.querySelectorAll('input[type="file"]'))
                    f.addEventListener('change',file.selectPart,false);

                editor.multiItem.updateButtonrows(ret.parentNode);
            },
            
            // button functions
            makePlus(el) {
                const button = dom.makeEl('div');
                const emptyel = el.cloneNode(true);
                for(const i of emptyel.querySelectorAll('input,textarea')) {
                    i.value = '';
                }
                for(const o of emptyel.querySelectorAll('option')) {
                    o.selected = false;
                }

                button.classList.add('plusbutton');
                button.append(editor.multiItem.makeIcon('#plusicon','20px'));
                button.title = 'add new section';
                button.setAttribute('aria-label','add new section');
                button.setAttribute('aria-pressed','false');
                button.setAttribute('role','button');
                button.myItem = emptyel;
                return button;
            },
            
            makeIcon(id,size) {
                const wh = size || '15px';
                const asset = document.querySelector(`#assets ${id}`).cloneNode(true);
                asset.style.width = wh;
                asset.style.height = wh;
                return asset;
            },

            makeButtonrow() {
                const row = dom.makeEl('div');
                row.classList.add('buttonrow');
                const killbutton = dom.makeEl('button');
                killbutton.type = 'button';
                killbutton.classList.add('multi-kill');
                killbutton.append(editor.multiItem.makeIcon('#closeicon'));
                killbutton.title = 'delete item';
                killbutton.setAttribute('aria-label','delete item');
                const upbutton = dom.makeEl('button');
                upbutton.type = 'button';
                upbutton.classList.add('multi-up');
                upbutton.append(editor.multiItem.makeIcon('#upicon'));
                upbutton.title = 'move up';
                upbutton.setAttribute('aria-label','move up');
                const downbutton = dom.makeEl('button');
                downbutton.type = 'button';
                downbutton.classList.add('multi-down');
                downbutton.append(editor.multiItem.makeIcon('#downicon'));
                downbutton.title = 'move down';
                downbutton.setAttribute('aria-label','move down');
                row.appendChild(upbutton);
                row.appendChild(downbutton);
                row.appendChild(killbutton);
                return row;
            },
            
            updateButtonrows(el) {
                if(!el) return;
                //const items = [...el.querySelectorAll('.multi-item')];
                const items = editor.multiItem.get(el);
                if(items.length === 0) return;
                const first = items.shift();
                first.querySelector('.multi-up').disabled = true;
                
                const last = items.pop();
                if(last) {
                    first.querySelector('.multi-down').disabled = false;
                    last.querySelector('.multi-up').disabled = false;
                    last.querySelector('.multi-down').disabled = true;
                }
                else
                    first.querySelector('.multi-down').disabled = true;

                for(const i of items) {
                    i.querySelector('.multi-up').disabled = false;
                    i.querySelector('.multi-down').disabled = false;
                }
            },

            up(button) {
                const multiItem = button.closest('.multi-item');
                if(multiItem.previousElementSibling)
                    multiItem.parentNode.insertBefore(multiItem,multiItem.previousElementSibling);
                editor.multiItem.updateButtonrows(multiItem.parentNode);
            },
            
            down(button) {
                const multiItem = button.closest('.multi-item');
                if(multiItem.nextElementSibling && !multiItem.nextElementSibling.classList.contains('plusbutton'))
                    multiItem.parentNode.insertBefore(multiItem.nextElementSibling,multiItem);
                editor.multiItem.updateButtonrows(multiItem.parentNode);
            },
        },

        populate(els) {    
            const makeOption = function(e) {
                const o = document.createElement('option');
                o.value = e.getAttribute('key');
                o.textContent = e.textContent;
                if(e.getAttribute('selected') === 'true') o.selected = true;
                return o;
            };
            for(const el of els) {
                const list = el.dataset.list;
                const entries = state.xDefinitions.querySelector(list).children;
                for(const e of entries) {
                    if(e.nodeName === 'tst:group') {
                        const g = document.createElement('optgroup');
                        g.label = e.getAttribute('label');
                        for(const ee of e.children)
                            g.appendChild(makeOption(ee));
                        el.add(g,null);
                    }
                    else
                        el.add(makeOption(e),null);
                }

            }
        },

        apply: {
            update() {
                const invalid = editor.apply.checkInvalid();
                if(invalid) {
                    invalid.scrollIntoView({behavior: 'smooth', block: 'center'});
                    if(invalid.classList.contains('CodeMirror-required') ||
                       (invalid.validity && !invalid.validity.valid) ) {
                        const errorname = invalid.name ? 
                            invalid.name.replaceAll('_',' ') :
                            'field';
                        alert(`Missing or incomplete ${errorname}`);
                    }
                    else {
                        const txt = invalid.textContent;
                        const quoted = txt.trim() != '' ?
                            `: '${txt}'` : '';
                        alert(`XML error${quoted}`);
                    }
                    return;
                }
                
                editor.destroyJS();

                const toplevel = editor.apply.fields(state.xmlDoc);
                
                editor.postProcess(toplevel);

                // write to string to fix xml:lang attributes
                const serialized = xml.serialize(state.xmlDoc);
                state.xmlDoc = xml.parseString(serialized);
                file.render(state.xmlDoc);
                
                autosaved.saveStr(serialized);
            },
        
            checkInvalid() {
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
      
            fields(doc,sanitize) {
                const fields = state.heditor.querySelectorAll('[data-select]');
                const toplevel = doc.querySelector(state.toplevel);
                for(const field of fields) {
                    if(field.classList.contains('multiple')) {
                        editor.apply.multiFields(field,toplevel,sanitize);
                    }
                    else editor.apply.updateXML(field,toplevel,sanitize);
                }
                return toplevel;
            },

            multiFields(field,toplevel,sanitize) {
                const selector = field.dataset.select || field.dataset.subselect;
                xml.removeAllEls(selector,toplevel);
                //const items = field.querySelectorAll('.multi-item');
                //const items = editor.matchChildren(field,'.multi-item');
                //const items= [...field.children].filter(e => e.matches('.multi-item'));
                const items = editor.multiItem.get(field);
                for(const item of items) {
                    const newXml = xml.makeElDeep(selector,toplevel,true);

                    const subfields = editor.apply.getSubFields(item);
                    for(const subfield of subfields)  {
                        if(subfield.classList.contains('multiple')) {
                            editor.apply.multiFields(subfield,newXml,sanitize);
                        }
                        else
                            editor.apply.updateXML(subfield,newXml,sanitize);
                    }
                }
            },
                
            getSubFields(el) {
                const nextNode = (node,skipKids = false) => {
                    if(node.firstElementChild && !skipKids)
                        return node.firstElementChild;
                    while(node) {
                        if(node.nextElementSibling) return node.nextElementSibling;
                        node = node.parentNode;
                        if(node === el) return null;
                    }
                    return null;
                };
                const ret = [];
                let nxt = nextNode(el);
                while(nxt) {
                    if(nxt.dataset.subselect || nxt.dataset.subattr)
                        ret.push(nxt);
                    if(nxt.classList.contains('multiple'))
                        nxt = nextNode(nxt,true);
                    else
                        nxt = nextNode(nxt,false);
                }
                return ret;
            },

            removeXML(node) {
                if(!node.hasAttributes() && !node.hasChildNodes()) node.remove();
            },

            updateXML(field,toplevel,sanitize) {
                // class="nosanitize": tosanitize = false 
                // sanitize = true: tosanitize = true
                // not textarea: tosanitize = true
                // otherwise: tosanitize = false
                const tosanitize = !field.classList.contains('nosanitize') &&
                                   sanitize || 
                                   field.tagName !== 'TEXTAREA' || 
                                   false;
                const selector = field.dataset.select || field.dataset.subselect;
                const selected = (selector && selector !== ':scope') ?
                    toplevel.querySelector(selector) :
                    toplevel;
                const attr = field.dataset.attr || field.dataset.subattr;
                const prefix = field.dataset.prefix;
                const valtrimmed = field.value.trim();

                if(!valtrimmed) {
                    if(selected) { // if the element already exists
                        if(attr) {
                            if(selected.hasAttribute(attr))
                                selected.removeAttribute(attr);
                                // should we make empty attributes?
                        }
                        else
                            selected.innerHTML = '';
                            // should we save just spaces?

                        if(!field.dataset.hasOwnProperty('subattr') && 
                           !field.dataset.hasOwnProperty('subselect'))
                            // don't remove multiItems automatically
                            editor.apply.removeXML(selected);
                    }
                    return;
                }
                const xmlEl = selected || xml.makeElDeep(selector,toplevel);
                
                const getVal = (field) => {
                    let val = field.type === 'text' ? 
                        valtrimmed : 
                        field.value;

                    if(field.multiple) {
                        const selected = [];
                        for(const opt of field.querySelectorAll('option'))
                            if(opt.selected) selected.push(opt.value);
                        val = selected.join(' ');
                    }

                    if(prefix) 
                        val = prefix + val;
                    return val;
                };
                
                const value = getVal(field);

                if(attr) {
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
        },

        postProcess(toplevel) {
            const par = toplevel || state.xmlDoc;

            const supportDescs = par.querySelectorAll('supportDesc');
            for(const supportDesc of supportDescs) {
                // condition after last foliation
                const condition = supportDesc.querySelector('condition');
                const lastFoliation = supportDesc.querySelector('foliation:last-of-type');
                if(condition && lastFoliation) lastFoliation.insertAdjacentElement('afterend',condition);
            }

            // add xml:lang to rubric, incipit, etc.
            const msItems = par.querySelectorAll('msContents > msItem');
            for(const msItem of msItems) {
                const textlang = msItem.querySelector('textLang');
                const textid = msItem.getAttribute('xml:id');
                const lang = textlang && textlang.getAttribute('mainLang');
                if(!lang) continue;
                
                const langmap = new Map([
                    ['tam','ta'],
                    ['san','sa'],
                    ['fra','fr'],
                    ['eng','en'],
                    ['ara','ar'],
                    ['deu','de'],
                    ['pli','pi'],
                    ['por','pt'],
                    ['lat','la']
                ]);

                const lang2 = langmap.get(lang) || lang;

                const els = [...msItem.children].filter(el => 
                    el.matches('title,author,rubric,incipit,explicit,finalRubric,colophon')
                );

                for(const el of els) {
                    const tamilchars = [...el.textContent.matchAll(/[\u0B80-\u0BFF]/g)];
                    const langscript = (tamilchars.length / el.textContent.length > 0.5) ?
                        lang2 + '-Taml' :
                        lang2;
                    el.setAttribute('xml:lang',langscript); 
                }

                const transcr = par.querySelector(`text[corresp="#${textid}"]`);
                if(transcr) transcr.setAttribute('xml:lang',lang2);
            }
        },

        selects: {
            make(el) {
                el.id = 'box' + Math.random().toString(36).substr(2,9);
                const mbox = new vanillaSelectBox(`#${el.id}`,{placeHolder: 'Choose...',disableSelectAll: true});
                mbox.setValue(
                    [...el.querySelectorAll('option')].filter(o => o.selected).map(o => o.value)
                );
                mbox.origEl = el;
                state.multiselect.push(mbox);
            },

            listen(sel,par) {
                const t = par || state.heditor;
                const field = t.querySelectorAll(`[name=${sel}]`);
                for(const f of field)
                    f.addEventListener('blur',editor.selects.update.bind(null,sel),{passive: true});
            },
            
            update(sel) {
                const values = [...state.heditor.querySelectorAll(`[name=${sel}]`)].map(el => el.value.trim());
                const valueset = new Set(['',...values]);
                const alloptions = [...valueset].map(str => {
                    const opt = document.createElement('option');
                    opt.setAttribute('value',str);
                    opt.append(str);
                    return opt;
                });
                const selects = state.heditor.querySelectorAll(`select[data-from=${sel}]`);
                for(const select of selects) {
                    const options = select.multiple ?  alloptions.slice(1) : alloptions;

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
                        const mbox = (function() {
                            for(const m of state.multiselect)
                                if(m && m.origEl === select) return m;
                        }());
                        if(mbox) {
                            mbox.destroy();
                            delete state.multiselect[state.multiselect.indexOf(mbox)];
                            editor.selects.make(select);
                        }
                    }
                }
            },
        },

        upgrade(doc) {
            const tests = [
                {name: 'shelfmark', select: 'idno[type="cote"]'},
                {name: 'old_shelfmark', select: 'idno[type="ancienne cote"]'},
                {name: 'foliation', select: 'foliation[n]'},
                {name: 'editor', select: 'editionStmt'}
            ];
            const funcs = {
                shelfmark(doc) {
                    const cote = doc.querySelector('idno[type="cote"]');
                    cote.setAttribute('type','shelfmark');
                },
                old_shelfmark(doc) {
                    const acote = doc.querySelector('idno[type="ancienne cote"]');
                    acote.removeAttribute('type');
                    const alternate = xml.makeEl(doc,'idno');
                    alternate.setAttribute('type','alternate');
                    acote.insertAdjacentElement('beforebegin',alternate);
                    alternate.appendChild(acote);
                },
                foliation(doc) {
                    const fs = doc.querySelectorAll('foliation[n]');
                    const collation = (() => {
                        const c = document.querySelector('collation');
                        if(c) return c;
                        const newc = xml.makeEl(doc,'collation');
                        fs[0].insertAdjacentElement('beforebegin',newc);
                        return newc;
                    })();
                    for(const f of fs) {
                        const n = f.getAttribute('n');
                        if(!n) continue;
                        const desc = xml.makeEl(doc,'desc');
                        desc.setAttribute('xml:id',n);
                        while(f.firstChild)
                            desc.appendChild(f.firstChild);
                        collation.appendChild(desc);
                        f.remove();
                    }
                },
                editor(doc) {
                    const eStmt = doc.querySelector('editionStmt');
                    const pNames = eStmt.querySelectorAll('persName');
                    const oNames = eStmt.querySelectorAll('orgName');
                    const tStmt = doc.querySelector('titleStmt');
                    const zip = (a, b) => Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);
                    const names = zip(pNames,oNames);
                    for(const name of names) {
                        const e = xml.makeEl(doc,'editor');
                        e.appendChild(name[0]);
                        e.appendChild(name[1]);
                        tStmt.appendChild(e);
                    }
                    eStmt.remove();
                }
            };
            
            const found = [];
            for(const test of tests) {
                const el = doc.querySelector(test.select);
                if(el) found.push(test.name);
            }
            if(found.length > 0) {
                const fs = found.join(', ');
                alert('This file was created with an older version of the editor. The following elements will be updated:\r\n' + fs);
                for(const f of found)
                    funcs[f](doc);
            }
        },
    }; // end editor

    const xml = {
        parseString(str) {
            const parser = new DOMParser();
            const newd = parser.parseFromString(str,'text/xml');
            if(newd.documentElement.nodeName === 'parsererror')
                alert('XML errors');
            else
                return newd;
        },
        serialize(el) {
            const s = new XMLSerializer();
            return s.serializeToString(el);
        },
        innerXML(el) {
            const empty = el.cloneNode();
            empty.innerHTML = '\u{FFFFD}';
            const str = xml.serialize(el);
            const emptystr = xml.serialize(empty);
            const [starttag,endtag] = emptystr.split('\u{FFFFD}');
            return str.slice(starttag.length).slice(0,-endtag.length);
        },
        unsanitize(str,attr) {
            return attr ?
                he.unescape(str,{isAttributeValue: true}) :
                he.unescape(str);
        },
        sanitize(str) {
            return he.escape(str);
        },
        async XSLTransform(xslsheet,doc) {
            // compile all xsl:imports to avoid browser incompatibilities
            
            for(const x of xslsheet.querySelectorAll('import')) {
                const resp = await fetch(x.getAttribute('href'));
                const i = xml.parseString(await resp.text());

                while(i.documentElement.firstChild)
                    x.before(i.documentElement.firstChild);
                x.remove();
            }
            const xproc = new XSLTProcessor();
            xproc.importStylesheet(xslsheet);
            return xproc.transformToDocument(doc);
        },
    
        /*removeEl: (path,toplevel) => {
            const par = toplevel || state.xmlDoc;
            const el = par.querySelector(path);
            if(el) el.remove();
        },*/

        removeAllEls(path,toplevel) {
            const els = toplevel.querySelectorAll(path);
            for(const el of els)
                el.remove();
        },
        makeEl(doc,name) {
            const ns = doc.documentElement.namespaceURI;
            return doc.createElementNS(ns,name);
        },

        makeElDeep(path,toplevel,duplicate) {
            const thisdoc = toplevel.ownerDocument;
            const ns = thisdoc.documentElement.namespaceURI;
            const children = path.split(/\s*>\s*/g).filter(x => x);
            const last = duplicate ?
                children.pop() :
                null;

            const makeNewChild = (path,par) => {
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
    }; // end xml

    const autosaved = {
        fill() {
            const par = document.getElementById('autosavebox');
            par.style.display = 'flex';
            const box = document.getElementById('autosaveentries');
            lf.keys().then(ks => {
                for(const k of ks) {
                    if(!k.startsWith(state.autosaveprefix)) continue;
                    const fname = k.slice(state.autosaveprefix.length);
                    const newel = dom.makeEl('div');
                    newel.classList.add('autosaved');
                    newel.append(fname);
                    newel.dataset.storageKey = k;
                    const trashasset = editor.multiItem.makeIcon('#closeicon');
                    const trash = dom.makeEl('span');
                    trash.title = `delete autosaved ${fname}`;
                    trash.classList.add('trash');
                    trash.appendChild(trashasset);
                    trash.height = 20;
                    newel.appendChild(trash);
                    newel.addEventListener('click',autosaved.load.bind(null,k));
                    trash.addEventListener('click',autosaved.remove.bind(null,k));
                    box.appendChild(newel);
                }
            });
        },

        load(k,e) {
            if(e.target.closest('.trash'))
                return;
            lf.getItem(k).then(i => {
                document.getElementById('openform').style.display = 'none';
                file.parse(editor.init,{target: {result: i}});
                //state.filename = k;
                state.filename = k.slice(state.autosaveprefix.length);
            });
        },

        remove(k) {
            const name = k.slice(state.autosaveprefix.length);
            if(window.confirm(`Do you want to delete ${name}?`)) {
                lf.removeItem(k);
                document.querySelector(`#autosavebox .autosaved[data-storage-key='${k}']`).remove();
            }
        },
        
        setFilename(doc) {
            if(state.filename.match(/^\[.*\]$/)) {
                const shelfmark = doc.querySelector('idno[type="shelfmark"]');
                if(shelfmark && shelfmark.textContent && shelfmark.textContent.trim() !== '')
                    state.filename = `[${shelfmark.textContent}]`;
            }
        },

        save(draft = false) {
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
                const vsbel = document.getElementById(`btn-group-#${mb.origEl.id}`);
                if(!vsbel) continue;
                const selected = vsbel.querySelectorAll('li.active');
                for(const s of selected) {
                    const o = mb.origEl.querySelector(`option[value='${CSS.escape(s.dataset.value)}']`);
                    if(o) o.selected = true;
                }
            }
            editor.apply.fields(docclone,true);
          
            autosaved.setFilename(docclone);
           
            docclone.insertBefore(
                docclone.createProcessingInstruction('tst','sanitized="true"'),
                docclone.firstChild);

            lf.setItem(state.autosaveprefix+state.filename,xml.serialize(docclone)).then( () => {
                const footer = document.getElementById('footermessage');
                footer.style.transition = 'unset';
                footer.style.opacity = 0;
                window.getComputedStyle(footer).opacity;
                footer.style.transition = 'opacity 1s ease-in';
                footer.textContent = `Autosaved ${(new Date).toLocaleString()}`;
                window.setTimeout(() => {
                    footer.style.opacity = 1;
                },1000);
            });

            if(draft) file.saveAs(docclone,'_draft');
        },
        saveStr(str) {
            autosaved.setFilename(state.xmlDoc);
            lf.setItem(state.autosaveprefix+state.filename,str);
        },
    }; // end autosaved
    
    const dom = {
        clearEl(el) {
            while(el.firstChild)
                el.removeChild(el.firstChild);
        },
        makeEl(name,doc) {
            const d = doc ? doc : document;
            return d.createElement(name);
        },
    };

    window.addEventListener('load',init);
}());
