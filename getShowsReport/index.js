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

    function getShowsReport(venueID) {
        return new Promise((resolve, reject) => {
            pool.query("CALL generateShowsReport(?)", [venueID], (error, rows) => {
                if(error) { return reject(error); }
                if(rows.length > 0) {
                    return resolve(rows[0]);
                }
                else {
                    return resolve([]);
                }
            });
        });
    }


    let response = undefined
    try {
        let hasAdministratorAuthentication = await isValueInRow("Administrators", "administratorID", event.userID);
        let hasVenueManagerAuthorization = await isValueInRow("Venues", "venueID", event.userID);
        if(!hasAdministratorAuthentication && !hasVenueManagerAuthorization) {
            throw ("User is not authorized to perform this action");
        }

        let venueID = hasAdministratorAuthentication ? event.venueID : event.userID;
        let venueExists = await isValueInRow("Venues", "venueID", venueID);
        if(!venueExists) { throw ("Venue not found"); }

        let showsReport = await getShowsReport(venueID);

        response = {
            statusCode: 200,
            showsReport
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
