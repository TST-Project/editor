import fs from 'fs';
import xpath from 'xpath';
import jsdom from 'jsdom';

const loadIndex = () => {
    const str = fs.readFileSync('index.html',{encoding:'utf-8'}).trim(); // there's a non-breaking space for some reason
    const dom = new jsdom.JSDOM(str);
    return dom;
    //const parser = new (new jsdom.JSDOM('')).window.DOMParser();
    //return parser.parseFromString(str, 'text/html');
    //return (new jsdom.JSDOM(str)).window.document;
};

const loadDefinitions = () => {
    const parser = new (new jsdom.JSDOM('')).window.DOMParser();
    const str = fs.readFileSync('../../../lib/xslt/definitions.xsl'); 
    return parser.parseFromString(str, 'text/xml');
};

const populateSelect = (els,doc,defs) => {
    const makeOption = function(e) {
        const o = doc.createElement('option');
        o.value = e.getAttribute('key');
        o.textContent = e.textContent;
        if(e.getAttribute('selected') === 'true') o.selected = true;
        return o;
    };
    for(const el of els) {
        const list = el.dataset.list;
        const entries = xpath.select(`//*[local-name(.)="${list}"]`,defs,true).children;
        for(const e of entries) {
            if(e.nodeName === 'tst:group') {
                const g = doc.createElement('optgroup');
                g.label = e.getAttribute('label');
                g.dataset.way = 'open';
                for(const ee of e.children)
                    g.appendChild(makeOption(ee));
                el.add(g,null);
            }
            else
                el.add(makeOption(e),null);
        }
        delete el.dataset.list;
    }

};

const main = () => {
    const template = loadIndex();
    const defs = loadDefinitions();
    const els = template.window.document.querySelectorAll('[data-list]');
    populateSelect(els,template.window.document,defs);
    fs.writeFile('../../index.html',template.serialize(),{encoding: 'utf8'},function(){return;});
};

main();
