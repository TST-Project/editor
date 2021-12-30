// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Depends on htmlhint.js from http://htmlhint.com/js/htmlhint.js

// declare global: HTMLHint

const { HTMLHint, HTMLParser } = require ('./htmlhint-custom.js');

(function(mod) {
    if (typeof exports == 'object' && typeof module == 'object') // CommonJS
        //mod(require('codemirror'), require('htmlhint'));
        mod(require('codemirror'));
    else if (typeof define == 'function' && define.amd) // AMD
        define(['codemirror', 'htmlhint'], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
    'use strict';
    
    var defaultRules = {
        'tagname-lowercase': false,
        'attr-lowercase': false,
        'attr-no-namespaces': ['xml'],
        'attr-value-double-quotes': false,
        'doctype-first': false,
        'tag-pair': true,
        'spec-char-escape': true,
        'id-unique': false,
        'src-not-empty': false,
        'attr-no-duplication': true,
        'attr-unsafe-chars': true
    };

    CodeMirror.registerHelper('lint', 'xml', function(text, options) {
        var found = [];
        if (!HTMLHint) return found;
        var messages = HTMLHint.verify(text, options && options.rules || defaultRules);
        //if (!window.HTMLHint) return found;
        //var messages = window.HTMLHint.verify(text, options && options.rules || defaultRules);
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            var startLine = message.line - 1, endLine = message.line - 1, startCol = message.col - 1, endCol = message.col;
            found.push({
                from: CodeMirror.Pos(startLine, startCol),
                to: CodeMirror.Pos(endLine, endCol),
                message: message.message,
                severity : message.type
            });
        }
        return found;
    });
});
