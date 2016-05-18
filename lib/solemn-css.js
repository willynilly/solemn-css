var fs = require('fs');
var _ = require('lodash');
var profane = require('profane');
var css = require('css');

function detect(fileName) {
    var codeTexts = parse(fileName);
    return getViolationsForCodeTexts(fileName, codeTexts);
}

function detectInText(text, fileName) {
    if (fileName === undefined) {
        fileName = '';
    }
    var codeTexts = parseText(text);
    return getViolationsForCodeTexts(fileName, codeTexts);
}

function parse(fileName) {
    var text = fs.readFileSync(fileName) + '';
    return parseText(text);
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
    var issues = profane.checkForCategories(text);
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
    var violations = [];
    // find profane words
    _.forEach(codeTexts.declarations, function(declaration) {
        declaration.profanewordsForPropertyName = profane.checkForWords(declaration.property);
        declaration.profanewordsForPropertyValue = profane.checkForWords(declaration.value);
    });

    _.forEach(codeTexts.selectors, function(selector) {
        selector.profanewords = profane.checkForWords(selector.selectors.join(' '));
    });

    _.forEach(codeTexts.comments, function(comment) {
        comment.profanewords = profane.checkForWords(comment.comment);
    });

    // find violations for profane words
    _.forEach(codeTexts.declarations, function(declaration) {
        if (declaration.profanewordsForPropertyName.length) {
            var v = createViolation('property name', fileName, declaration.position, declaration.property);
            violations.push(v);
        }
        if (declaration.profanewordsForPropertyValue.length) {
            var v = createViolation('property value', fileName, declaration.position, declaration.value);
            violations.push(v);
        }
    });
    _.forEach(codeTexts.selectors, function(selector) {
        if (selector.profanewords.length) {
            var v = createViolation('selector', fileName, selector.position, selector.selectors.join(' '));
            violations.push(v);
        }
    });
    _.forEach(codeTexts.comments, function(comment) {
        if (comment.profanewords.length) {
            var v = createViolation('comment', fileName, comment.position, comment.comment);
            violations.push(v);
        }
    });
    return violations;
}

function getDictionary() {
    return profane;
}

function setDictionary(d) {
    profane = d;
}

function addNewElementsToArray(oldArray, elements) {
    _.forEach(elements, function(e) {
        if (!_.find(oldArray, e)) {
            oldArray.push(e);
        }
    });
    return oldArray;
}

module.exports = {
    detect: detect,
    detectInText: detectInText,
    reportViolations: reportViolations,
    formatViolation: formatViolation,
    getDictionary: getDictionary,
    setDictionary: setDictionary,
};
