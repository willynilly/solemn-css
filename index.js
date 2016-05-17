var fs = require('fs');
var _ = require('lodash');
var profanity = require('profanity-util');
var css = require('css');

if (process.argv[2]) {
    main();
}

function main() {
    var filename = process.argv[2];
    var codeTexts = parseCodeTexts(filename);
    codeTexts = detectProfanity(codeTexts);
    reportProfanityViolations(filename, codeTexts);
}

function addNewElementsToArray(oldArray, elements) {
    _.forEach(elements, function(e) {
        if (!_.find(oldArray, e)) {
            oldArray.push(e);
        }
    });
    return oldArray;
}

function parseCodeTexts(filename) {
    var codeTexts = {
        comments: [],
        selectors: [],
        declarations: [],
    };
    var ast = css.parse(fs.readFileSync(filename) + '');
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

function detectProfanity(codeTexts) {
    _.forEach(codeTexts.declarations, function(declaration) {
        declaration.profanewordsForPropertyName = profanity.check(declaration.property);
        declaration.profanewordsForPropertyValue = profanity.check(declaration.value);
    });

    _.forEach(codeTexts.selectors, function(selector) {
        selector.profanewords = profanity.check(selector.selectors.join(' '));
    });

    _.forEach(codeTexts.comments, function(comment) {
        comment.profanewords = profanity.check(comment.comment);
    });
    return codeTexts;
}

function reportProfanityViolations(fileName, codeTexts) {
    var violations = getProfanityViolations(fileName, codeTexts);
    if (violations.length) {
        _.forEach(violations, function(v) {
            console.log(v);
        });
    } else {
        console.log('SUCCESS: No profanity found in ' + fileName);
    }
}

function createProfanityViolation(codeTextType, fileName, pos, text) {
    text = text + '';
    var v = 'VIOLATION (issue: profanity, type: ' + codeTextType + ', file: ' + fileName + ', line: ' + pos.start.line + ' col: ' + pos.start.column + ') = ' + text.trim();
    return v;
}

function getProfanityViolations(fileName, codeTexts) {
    var violations = [];
    _.forEach(codeTexts.declarations, function(declaration) {
        if (declaration.profanewordsForPropertyName.length) {
            var v = createProfanityViolation('property name', fileName, declaration.position, declaration.property);
            violations.push(v);
        }
        if (declaration.profanewordsForPropertyValue.length) {
            var v = createProfanityViolation('property value', fileName, declaration.position, declaration.value);
            violations.push(v);
        }
    });
    _.forEach(codeTexts.selectors, function(selector) {
        if (selector.profanewords.length) {
            var v = createProfanityViolation('selector', fileName, selector.position, selector.selectors.join(' '));
            violations.push(v);
        }
    });
    _.forEach(codeTexts.comments, function(comment) {
        if (comment.profanewords.length) {
            var v = createProfanityViolation('comment', fileName, comment.position, comment.comment);
            violations.push(v);
        }
    });
    return violations;
}

module.exports = {
    parseCodeTexts: parseCodeTexts,
    detectProfanity: detectProfanity,
    reportProfanityViolations: reportProfanityViolations,
    getProfanityViolations: getProfanityViolations,
};
