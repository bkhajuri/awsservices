const es = require('../common/esconnection');
/*
 To backup Elasticsearch
 */
exports.handler = function (event, context, callback) {
    
    var client = es.getClient(true);

    var d = new Date();
   
   var newRepo = {
        "repository":"adesaworld-index-backups",
        "snapshot": d.getFullYear()+"-"+d.getDate()+"-"+d.getHours()+"-"+d.getMinutes()
    };
    
    client.snapshot.create(newRepo).then(function(data) {
     console.log("Repository "+newRepo.repository+" snapshot "+newRepo.snapshot);
     console.log(data);   
});

    callback(null, 'Success');
};
