var _ = require('lodash');
var consts = require('../../consts.js');
var languageManager = require('../../language_manager.js');

var ddmmyyyy_and_hhmm = require('./ddmmyyyy&hhmm.js');

var fullDateTokens = [
    ddmmyyyy_and_hhmm.tokens[0],
    ddmmyyyy_and_hhmm.tokens[1],
    ddmmyyyy_and_hhmm.tokens[2]
];

exports.tokens = [
    {
        example: '1945',
        category: 'year & date',
        regex: /(?:^|[\s,])(\d{4})(?:$|[\s年,.])/,
        affects: [{
            timeType: consts.timeTypes.year,
            affectType: consts.reltivity.absolute
        }],
        // Make sure there is no collision with (example) 12.4.2017
        verifier: function (match, dateString, state, settings, token) {

            for (var token of fullDateTokens) {
                var match = token.regex.exec(dateString);

                if (match) {
                    return false;
                }
            }

            return true;
        }
    },
    {
        example: '1st',
        category: 'year & date',
        regex: /(?:^|\s|-)(\d{1,2})(?:th|st|nd|rd|日)?(?:$|\s|,)/,
        affects: [{
            timeType: consts.timeTypes.day,
            affectType: consts.reltivity.absolute
        }],
        variables: {
            day: 1
        },
        // Note: only if verifier returns true the affects take place
        verifier: function (match, dateString, state, settings, token) {
            
            /* We want to verify 2 things:
                1. The number doesn't relate to 'ago', example: '4 days ago', 4 is not the number of the date
                2. The date description contains a month token
            */
            
            return conatinsMonthToken(dateString) && 
                !relatesToRelativeDescription(dateString, match, token);
        }
    }];

/**
 * Example: 
 * 25 may => true
 * 26 weeks => false
 * @param {*} dateString 
 */
function conatinsMonthToken(dateString) {

    for (const monthToken of languageManager.allMonthTokens)
    {
        if (monthToken.regex.exec(dateString)) {
            
            // Found month token!
            return true;
        }
    }

    return false;
}

/**
 * 25 may => false
 * 25 weeks ago => true
 * @param {*} dateString 
 */
function relatesToRelativeDescription(dateString, match, token) {

    var allAgoAndSince = languageManager.getAllAgoAndSince();

    for (var agoAndSince of allAgoAndSince) {
        if (isCollision(match, agoAndSince, dateString, token)) {
            return true;
        }
    }

    return false;
}

// Return true if there is absolute collision, for example: ago token matched in a certain language
function isCollision(match, multiLanguageAgoAndSince, dateString, token) {
    const AGO = 0;
    const SINCE = 1;

    // create language array
    var collisionMatch = []

    // If in this langauge there is a definition for "AGO"
    if (multiLanguageAgoAndSince.tokens[AGO]) {
        // If it matches
        collisionMatch[AGO] = multiLanguageAgoAndSince.tokens[AGO].regex.exec(dateString);
    }
    // If in this langauge there is a definition for "Since"
    if (multiLanguageAgoAndSince.tokens[SINCE]) {
        // If it maches
        collisionMatch[SINCE] = multiLanguageAgoAndSince.tokens[SINCE].regex.exec(dateString);
    }

    // If both didn't match, there wans't a collision
    if (!collisionMatch[AGO] && !collisionMatch[SINCE]) {
        return false;
    }

    // Assume that only one should match
    if (collisionMatch[AGO]) {
        collisionMatch = collisionMatch[AGO];
    }
    else {
        collisionMatch = collisionMatch[SINCE];
    }

    // Note: this is true for both AGO & SINCE tokens...
    var valueIdx = multiLanguageAgoAndSince.tokens[0].variables.value;
    var date = match[token.variables.day];

    // If the ago relate to the same value of date
    if (collisionMatch[valueIdx] == date) {
        // The ago realtes to the same number, thus there is a collision
        return true;
    }
    else {
        // There was no collision, the ago related to some other number
        return false;
    }
}
