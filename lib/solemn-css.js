var fs = require('fs');
var _ = require('lodash');
var css = require('css');
var Profane = require('profane');

function detect(fileName) {
    var codeTexts = this.parse(fileName);
    return this.getViolationsForCodeTexts(fileName, codeTexts);
}

function detectInText(text, fileName) {
    if (fileName === undefined) {
        fileName = '';
    }
    var codeTexts = this.parseText(text);
    return this.getViolationsForCodeTexts(fileName, codeTexts);
}

function parse(fileName) {
    var text = fs.readFileSync(fileName) + '';
    return this.parseText(text);
}

function parseText(text) {
    var codeTexts = {
        comments: [],
        selectors: [],
        declarations: [],
    };
    var ast = css.parse(text);
    _.forEach(ast.stylesheet.rules, function(rule) {
        if (rule.type === 'comment') {
            codeTexts.comments = addNewElementsToArray(codeTexts.comments, [rule]);
        }
        if (rule.type === 'rule') {
            codeTexts.selectors = addNewElementsToArray(codeTexts.selectors, [rule]);

            _.forEach(rule.declarations, function(declaration) {
                codeTexts.declarations = addNewElementsToArray(codeTexts.declarations, [declaration]);
            });

        }
    });
    return codeTexts;
}

function reportViolations(fileName, violations) {
    if (violations.length) {
        _.forEach(violations, function(v) {
            console.log(formatViolation(v));
        });
    } else {
        console.log('SUCCESS: No issues found in ' + fileName);
    }
}

function createViolation(codeTextType, fileName, pos, text) {
    text = text + '';
    var issues = this.profane.getCategoryCounts(text);
    var violation = {
        issues: issues,
        type: codeTextType,
        file: fileName,
        line: pos.start.line,
        column: pos.start.column,
        text: text,
    };
    return violation;
}

function formatViolation(violation) {
    var issuesText = '[' + _.map(violation.issues, function(value, key) {
        return key + '=' + value;
    }).join(' ') + ']';
    var v = 'VIOLATION (issues: ' + issuesText + ', type: ' + violation.type + ', file: ' + violation.file + ', line: ' + violation.line + ', col: ' + violation.column + ') = ' + violation.text.trim();
    return v;
}

function getViolationsForCodeTexts(fileName, codeTexts) {
    var profane = this.profane;

    var violations = [];
    // find profane words
    _.forEach(codeTexts.declarations, function(declaration) {
        declaration.profanewordsForPropertyName = profane.getWordCounts(declaration.property);
        declaration.profanewordsForPropertyValue = profane.getWordCounts(declaration.value);
    });

    _.forEach(codeTexts.selectors, function(selector) {
        selector.profanewords = profane.getWordCounts(selector.selectors.join(' '));
    });

    _.forEach(codeTexts.comments, function(comment) {
        comment.profanewords = profane.getWordCounts(comment.comment);
    });

    var that = this;
    // find violations for profane words
    _.forEach(codeTexts.declarations, function(declaration) {
        if (_.keys(declaration.profanewordsForPropertyName).length) {
            var v = that.createViolation('property name', fileName, declaration.position, declaration.property);
            violations.push(v);
        }
        if (_.keys(declaration.profanewordsForPropertyValue).length) {
            var v = that.createViolation('property value', fileName, declaration.position, declaration.value);
            violations.push(v);
        }
    });
    _.forEach(codeTexts.selectors, function(selector) {
        if (_.keys(selector.profanewords).length) {
            var v = that.createViolation('selector', fileName, selector.position, selector.selectors.join(' '));
            violations.push(v);
        }
    });
    _.forEach(codeTexts.comments, function(comment) {
        if (_.keys(comment.profanewords).length) {
            var v = that.createViolation('comment', fileName, comment.position, comment.comment);
            violations.push(v);
        }
    });
    return violations;
}

function getDictionary() {
    return this.profane;
}

function setDictionary(d) {
    this.profane = d;
}

function addNewElementsToArray(oldArray, elements) {
    _.forEach(elements, function(e) {
        if (!_.find(oldArray, e)) {
            oldArray.push(e);
        }
    });
    return oldArray;
}

var SolemnCSS = function() {
    this.profane = new Profane();
};

SolemnCSS.prototype = {
    detect: detect,
    detectInText: detectInText,
    reportViolations: reportViolations,
    formatViolation: formatViolation,
    getDictionary: getDictionary,
    setDictionary: setDictionary,
    parse: parse,
    parseText: parseText,
    getViolationsForCodeTexts: getViolationsForCodeTexts,
    createViolation: createViolation
}

module.exports = SolemnCSS
