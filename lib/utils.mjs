import he from './he.mjs';
const xml = {
    parseString(str) {
        const parser = new DOMParser();
        const newd = parser.parseFromString(str,'text/xml');
        if(newd.documentElement.nodeName === 'parsererror')
            alert(`The XML file could not be loaded. Please contact your friendly local system administrator. Error: ${newd.documentElement.textContent}`);
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

export { xml, dom };
