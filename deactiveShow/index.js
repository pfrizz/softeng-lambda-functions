const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access');

exports.handler = async (event) => {
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    function isAuthorizedAsVenueManager(userID) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Venues WHERE venueID=?", [userID], (error, rows) => {
                if(error) { return reject(error); }
                let isAuthorized = rows.length > 0;
                return resolve(isAuthorized);
            });
        });
    }

    function activateShow(showID) {
        return new Promise((resolve, reject) => {
            pool.query("UPDATE Shows SET isShowActive=0 WHERE showID=?", [showID], (error, rows) => {
                if(error) { return reject(error); }
                return resolve();
            });
        });
    }


    let response = undefined
    try {
        if(!await isAuthorizedAsVenueManager(event.userID)) { 
            throw ("User is not authorized as a venue manager");
        }

        await activateShow(event.showID);

        response = {
            statusCode: 200
        }
    } catch(err) {
        response = {
            statusCode: 400,
            error: err
        }
    } finally {
        pool.end();
    }

    return response;
}
