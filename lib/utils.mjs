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
        
        const xproc = new XSLTProcessor();
        const compiled = await compileImports(xslsheet);
        xproc.importStylesheet(compiled);
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

const loadDoc = async (fn,cache='no-cache') => {
    const res = await fetch(fn, {cache: cache});
    if(!res.ok) {
        console.log(fn + ': ' + res.statusText);
        return null;
    }
    const xmltext = await res.text();
    return (new DOMParser()).parseFromString(xmltext, 'text/xml');
};

const compileImports = async (xsltsheet,prefix='') => {
    const imports = xsltsheet.querySelectorAll('import');
    if(!imports) return xsltsheet;
    for(const x of imports) {
        const href = prefix + x.getAttribute('href');
        const split = href.split('/');
        split.pop();
        const newprefix = split.join('/') + '/';
        const i = await loadDoc(href,'default');
        const attrs = i.documentElement.attributes;
        for(const attr of attrs) {
          if(!xsltsheet.documentElement.getAttributeNS(attr.namespaceURI,attr.localName))
            xsltsheet.documentElement.setAttributeNS(attr.namespaceURI,attr.name,attr.value);
        }
        while(i.documentElement.firstChild) {

            if(i.documentElement.firstChild.nodeName === 'xsl:param') {
                if(xsltsheet.querySelector(`variable[name="${i.documentElement.firstChild.getAttribute('name')}"]`)) { 
                    i.documentElement.firstChild.remove();
                    continue;
                }
            }
            if(i.documentElement.firstChild.nodeName === 'xsl:import') {
                const ii = await loadDoc(newprefix + i.documentElement.firstChild.getAttribute('href'),'default');
                const embed = await compileImports(ii,newprefix);
                while(embed.documentElement.firstChild)
                        x.before(embed.documentElement.firstChild);
                i.documentElement.firstChild.remove();
                continue;
            }

            x.before(i.documentElement.firstChild);
        }
        x.remove();
    }
    return xsltsheet;
};

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
