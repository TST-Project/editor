import CodeMirror from 'codemirror';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/addon/hint/show-hint';
import './lib/xml-hint.js';
import './lib/htmlhint-custom.js';
import 'codemirror/addon/lint/lint';
import './lib/xml-lint.js';
import 'codemirror/addon/display/placeholder';

const _CodeMirror = CodeMirror;
export { _CodeMirror as CodeMirror };
