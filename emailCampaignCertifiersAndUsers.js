// Get campaign details
var campaign = openidm.action("iga/governance/admin/certification/{{certificationId}}", 'GET', { }, {});
var certData = {};
var searchAfter = [];

// Query all certification items, using pagination
do {
    var items = openidm.action("iga/governance/certification/{{certificationId}}/items/search", 'POST', { }, { _pageSize: 10000, _fields: 'user.mail,user.userName,user.givenName,user.sn,decision.certification.actors.userName,decision.certification.actors.givenName,decision.certification.actors.sn,decision.certification.actors.mail,decision.certification.status,decision.certification.decision', _searchAfter: searchAfter.join(',') });
    searchAfter = items.searchAfterKey;
    items.result.forEach(item => {
        var status = item.decision.certification.status;
        if (!certData[status]) {
            certData[status] = { "certifier": {}, "user": {}}
        };

        // Store unique users
        if (!certData[status]['user'][item.user.userName]) {
            certData[status]['user'][item.user.userName] = item.user;
        }

        // Store unique certifiers
        item.decision.certification.actors.forEach(actor => {
            if (!certData[status]['certifier'][actor.userName]) {
                certData[status]['certifier'][actor.userName] = actor;
            }
        });
    });
} while (items.result.length > 0);

// Get the list of active certifiers/users only
// NOTE - other statuses are available as well, completed items will be in the 'signed-off' key
var activeCertifiers = Object.values(certData['in-progress']['certifier']);
var activeUsers = Object.values(certData['in-progress']['user']);

// Email each certifier
activeCertifiers.forEach(certifier => {
    var obj = {
        givenName: certifier.givenName,
        sn: certifier.sn,
        mail: certifier.mail,
        userName: certifier.userName,
        campaign: {
            name: campaign.name,
            description: campaign.description
        }
    }
    var params = {
        templateName: "certifierTemplate",
        to: certifier.mail,
        object: obj
    }
    openidm.action("external/email", "sendTemplate", params);
})

// Email each target user
activeUsers.forEach(user => {
    var obj = {
        givenName: user.givenName,
        sn: user.sn,
        mail: user.mail,
        userName: user.userName,
        campaign: {
            name: campaign.name,
            description: campaign.description
        }
    }
    var params = {
        templateName: "userTemplate",
        to: user.mail,
        object: obj
    }
    openidm.action("external/email", "sendTemplate", params);
})

// Return active lists (for reference only)
var resp = {
    activeCertifiers: activeCertifiers,
    activeUsers: activeUsers
};
resp;
