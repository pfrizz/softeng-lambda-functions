const mysql = require('/opt/db_access/nodejs/node_modules/mysql');
const db_access = require('/opt/db_access/nodejs/db_access');

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

    function reserveSeat(venueID, showID, sectionType, seatRow, seatColumn) {
        return new Promise((resolve, reject) => {
            pool.query("CALL reserveSeat(?, ?, ?, ?, ?)",
                [venueID, showID, sectionType, seatRow, seatColumn], (error, rows) => {
                    if(error) { return reject(error); }
                    return resolve();
                });
        });
    }

    let response = undefined
    try {
        if(!await isValueInRow("Venues", "venueID", event.venueID)) {
            throw ("A venue with the ID '" + event.venueID + "' does not exist");
        }
        if(!await isValueInRow("Shows", "showID", event.showID)) {
            throw ("A show with the ID '" + event.showID + "' does not exist");
        }

        await reserveSeat(event.venueID, event.showID, event.sectionType, event.seatRow, event.seatColumn);

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
