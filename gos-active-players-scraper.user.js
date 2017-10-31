// ==UserScript==
// @name        Gates of Survival - Active Players scraper
// @namespace   https://www.gatesofsurvival.com
// @version     0.1
// @author      dang
// @description Shows active player data in table format. Based on Opal's Action Scraper: https://greasyfork.org/en/scripts/31091-action-scraper
// @match       https://www.gatesofsurvival.com/game/online.php
// @icon        https://www.google.com/s2/favicons?domain=https://www.gatesofsurvival.com/
// @updateURL   https://raw.github.com/dang-nabbit/gos-active-players-scraper/master/gos-active-players-scraper.user.js
// @grant       none
// ==/UserScript==

var errors = [];
var clans = [];
var noClan = {
    initials: 'None',
    players: [],
    skills: []
};
var totals = {
    initials: 'Total',
    players: [],
    skills: []
};

var playerTypes = [
    'Hardcore Ironman',
    'Ironman'
];
var numPlayerTypes = playerTypes.length;

var skills = [
    'Agility',
    'Arcane',
    'Archery',
    'Baking',
    'Botany',
    'Cooking',
    'Crafting',
    'Divination',
    'Exploration',
    'Fighting',
    'Firemaking',
    'Fishing',
    'Fletching',
    'Forestry',
    'Forging',
    'Gathering',
    'Hunting',
    'Jewelcrafting',
    'Looting',
    'Mining',
    'Prayer',
    'Runebinding',
    'Skinning',
    'Slaying',
    'Smelting',
    'Spellcraft',
    'Summoning',
    'Thieving',
    'Transmutation',
    'Woodworking',
    'Not skilling'
];
var numSkills = skills.length;

function addClanSkillCount(clan) {
    var skill;

    for (var i = 0; i < numSkills; i++) {
        skill = skills[i];

        clan.skills.push({
            name: skill,
            count: 0
        });
    }
}

function scrapePlayer(tdInnerHTML) {
    var mainRegEx = /<img src="images\/crowns\/(.+?)\.png".*?>.*?<input value="(\d+)".*?><input.*?>(.+?)<\/.*?<\/form>.*?\(Last Active: (.+?)\)/;
    var activityRegEx = /<b>Currently<\/b>: (.+?)<br>/;
    var clanRegex = /<b>Clan<\/b>: \[(.+?)\]/;
    
    var result = mainRegEx.exec(tdInnerHTML);

    var player = {};
    var crown;
    var activityResult;
    var activity;
    var skill;
    var type;
    var clanResult;
    var i;

    if (result === null) {
        return {
            error: 'Player data not recognized',
            content: tdInnerHTML
        };
    } else {
        player = {
            id: result[2],
            name: result[3],
            lastActive: result[4]
        };

        crown = result[1];
        if (crown.indexOf('crown_') > -1) {
            player.rank =  crown.replace('crown_', '');
        } else if (crown === 'sponsor') {
            player.rank = crown;
        } else {
            player.rank = 'Unrecognized';
        }
        
        activityResult = activityRegEx.exec(tdInnerHTML);

        if (activityResult !== null) {
            activity = activityResult[1];

            for (i = 0; i < numSkills; i++) {
                skill = skills[i];
                if (activity.indexOf(skill) > -1) {
                    player.skill = skill;

                    if (skill === 'Fighting') {
                        player.mob = activity.replace('Fighting a ', '');
                    }

                    break;
                }
            }
        }
        if (!player.skill) {
            player.skill = 'Not skilling';
            player.activity = activity || 'None';
        }


        for (i = 0; i < numPlayerTypes; i++) {
            type = playerTypes[i];
            if (tdInnerHTML.indexOf(type) > -1) {
                player.type = type;
                break;
            }
        }

        clanResult = clanRegex.exec(tdInnerHTML);
        if (clanResult !== null) {
            player.clan = clanResult[1];
        }
    }

    return player;
}

function addPlayerToList(td) {
    var player = scrapePlayer(td.innerHTML);
    var clan = {};
    var skill;
    var skillObj;

    if (player.error) {
        errors.push(player);
    } else if (player.clan) {
        clan = clans.find(function(clan) {return clan.initials === player.clan;});

        if (!clan) {
            clan = {
                initials: player.clan,
                players: [],
                skills: []
            };

            addClanSkillCount(clan);

            clans.push(clan);
        }
    } else {
        clan = noClan;
    }

    skillObj = clan.skills.find(function(skill) {return skill.name === player.skill;});
    skillObj.count++;
    
    clan.players.push(player);
}

function scrapeAll() {
    document.querySelectorAll('#third-container5 td').forEach(addPlayerToList);
}

function getErrorsTable() {
    var numErrors = errors.length;
    var div = document.createElement('div');
    
    if (numErrors > 0) {
        var title = document.createElement('b');
        title.appendChild(document.createTextNode('Errors'));
        div.appendChild(title);

        var table = document.createElement('table');
        div.appendChild(table);

        div.appendChild(document.createElement('hr'));

        var row = table.insertRow();
        var errorCell = row.insertCell();
        errorCell.outerHTML = '<th>Error</th>';
        var errorContentCell = row.insertCell();
        errorContentCell.outerHTML = '<th>Content</th>';
        
        var error;
        for (var i = 0; i < numErrors; i++) {
            error = errors[i];

            row = table.insertRow();
            
            errorCell = row.insertCell();
            errorCell.appendChild(document.createTextNode(error.error || ''));

            errorContentCell = row.insertCell();
            errorContentCell.appendChild(document.createTextNode(error.content || ''));
        }
    }

    return div;
}

function getPlayerTable(players) {
    var numPlayers = players.length;
    var div = document.createElement('div');
    
    if (numPlayers > 0) {
        var clan = players[0].clan;

        var title = document.createElement('b');
        title.appendChild(document.createTextNode(clan || 'No clan'));
        div.appendChild(title);

        var table = document.createElement('table');
        div.appendChild(table);

        div.appendChild(document.createElement('hr'));
        
        var row = table.insertRow();
        var nameCell = row.insertCell();
        nameCell.outerHTML = '<th>Name</th>';
        var idCell = row.insertCell();
        idCell.outerHTML = '<th>ID</th>';

        if (!clan) {
            var typeCell = row.insertCell();
            typeCell.outerHTML = '<th>Type</th>';
        }

        var lastActiveCell = row.insertCell();
        lastActiveCell.outerHTML = '<th>Last active</th>';
        var rankCell = row.insertCell();
        rankCell.outerHTML = '<th>Rank</th>';
        var skillCell = row.insertCell();
        skillCell.outerHTML = '<th>Skill</th>';
        var mobCell = row.insertCell();
        mobCell.outerHTML = '<th>Enemy</th>';
        var activityCell = row.insertCell();
        activityCell.outerHTML = '<th>Activity</th>';
        
        var player;

        for (var i = 0; i < numPlayers; i++) {
            player = players[i];

            row = table.insertRow();
            
            nameCell = row.insertCell();
            nameCell.appendChild(document.createTextNode(player.name || ''));

            idCell = row.insertCell();
            idCell.appendChild(document.createTextNode(player.id || ''));

            if (!clan) {
                typeCell = row.insertCell();
                typeCell.appendChild(document.createTextNode(player.type || ''));
            }

            lastActiveCell = row.insertCell();
            lastActiveCell.appendChild(document.createTextNode(player.lastActive || ''));

            rankCell = row.insertCell();
            rankCell.appendChild(document.createTextNode(player.rank || ''));

            skillCell = row.insertCell();
            skillCell.appendChild(document.createTextNode(player.skill || ''));

            mobCell = row.insertCell();
            mobCell.appendChild(document.createTextNode(player.mob || ''));

            activityCell = row.insertCell();
            activityCell.appendChild(document.createTextNode(player.activity || ''));
        }
    }

    return div;
}

function getSummary() {
    var summaryClans = clans.concat([noClan], [totals]);
    var numSummaryClans = summaryClans.length;
    var i;
    var j;
    
    var div = document.createElement('div');
    
    var title = document.createElement('b');
    title.appendChild(document.createTextNode('Summary'));
    div.appendChild(title);

    var table = document.createElement('table');
    div.appendChild(table);

    div.appendChild(document.createElement('hr'));

    var row = table.insertRow();
    
    var clanCell = row.insertCell();
    clanCell.outerHTML = '<th>Clan</th>';
    
    var skillCell;
    for (i = 0; i < numSkills; i++) {
        skillCell = row.insertCell();
        skillCell.outerHTML = '<th>' + skills[i] + '</th>';
    }
    
    var clanTotalCell = row.insertCell();
    clanTotalCell.outerHTML = '<th>Total</th>';

    var clan;
    var skill;
    var clanSkill;
    var skillCount;
    for (i = 0; i < numSummaryClans; i++) {
        clan = summaryClans[i];

        row = table.insertRow();
        
        clanCell = row.insertCell();
        clanCell.appendChild(document.createTextNode(clan.initials));

        for (j = 0; j < numSkills; j++) {
            clanSkill = clan.skills[j];
            skillCount = clanSkill.count;

            skillCell = row.insertCell();
            skillCell.appendChild(document.createTextNode(skillCount));

            totals.skills[j].count += skillCount;
        }

        clanTotalCell = row.insertCell();
        clanTotalCell.appendChild(document.createTextNode(clan.players.length));

        totals.players = totals.players.concat(clan.players);
    }

    return div;
}

function printDataTables() {
    addClanSkillCount(noClan);
    addClanSkillCount(totals);
    scrapeAll();

    var reportBody = window.open().document.body;
    reportBody.appendChild(getErrorsTable());
    reportBody.appendChild(getPlayerTable(noClan));
    
    var numClans = clans.length;
    for (var i = 0; i < numClans; i++) {
        reportBody.appendChild(getPlayerTable(clans[i].players));
    }
    
    reportBody.appendChild(getSummary());
}

printDataTables();
