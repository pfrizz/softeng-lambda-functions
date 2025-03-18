const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access');

exports.handler = async (event) => {
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    function isValueInRow(table, row, value) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM ?? WHERE ??=?", [table, row, value], (error, rows) => {
                if(error) { return reject(error); }
                let doesExist = rows.length > 0;
                return resolve(doesExist);
            });
        });
    }

    let isShowInactive = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Shows WHERE showID=? AND isShowActive=0", [showID], (error, rows) => {
                if(error) { return reject(error); }
                let showInactive = rows.length > 0;
                return resolve(showInactive)
            });
        });
    }

    let deleteShow = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("DELETE FROM Shows WHERE showID=?", [showID], (error, rows) => {
                if(error) { return reject(error); }
                return resolve();
            });
        });
    }

    let response = undefined;
    try {
        if(!await isValueInRow("Shows", "showID", event.showID)) {
            throw ("A show with the id '" + event.showID + "' does not exist");
        }

        let authorizedAsAdministrator = await isValueInRow("Administrators", "administratorID", event.userID);
        if(authorizedAsAdministrator) {
            // administrator can delete show regardless of active status
            await deleteShow(event.showID);
        }
        else {
            if(!await isValueInRow("Venues", "venueID", event.userID)) {
                throw ("User is not authorized to perform this action");
            }
            if(!await isShowInactive(event.showID)) {
                throw ("Venue manager cannot delete an active show");
            }

            await deleteShow(event.showID);
        }

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
