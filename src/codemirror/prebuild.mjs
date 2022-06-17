import fs from 'fs';
import xpath from 'xpath';
import jsdom from 'jsdom';

const loadDefinitions = () => {
    const parser = new (new jsdom.JSDOM('')).window.DOMParser();
    const str = fs.readFileSync('../../../lib/xslt/definitions.xsl'); 
    return parser.parseFromString(str, 'text/xml');
};

const defsToMap = (names,defs) => {
    const arr = names.map((name) => {
        const entries = [...xpath.select(`//*[local-name(.)="${name}"]`,defs,true).children];
        const keys = entries.flatMap(e => {
            if(e.nodeName === 'tst:group')
                return [...e.children].map(x => x.getAttribute('key'));
            else return e.getAttribute('key');
        });
        return [name,keys];
    });
    return new Map(arr);
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

const props = ['entityrend','additiontype','segtype','persroles','unclear'];

const main = () => {
    const defs = loadDefinitions();
    const obj = Object.fromEntries( defsToMap(props,defs) );
    const outstr = 'const definitions=' + JSON.stringify(obj) + ';export default definitions;';
    fs.writeFile('definitions.mjs',outstr,{encoding: 'utf8'},function(){return;});
};

main();
