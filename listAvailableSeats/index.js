const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access');

exports.handler = async (event) => {
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    function doesShowExist(showID) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Shows WHERE showID=?", [showID], (error, rows) => {
                if(error) { return reject(error); }
                let doesExist = rows.length > 0;
                return resolve(doesExist);
            });
        });
    }

    function isShowInPast(showID) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM Shows WHERE showID=? AND showDatetime < CONVERT_TZ(NOW(), 'UTC', 'US/Eastern')",
                [showID], (error, rows) => {
                    if(error) { return reject(error); }
                    let isInPast = rows.length > 0;
                    return resolve(isInPast);
                });
        });
    }

    function getAvailableSeats(showID, orderBy) {
        let procedure = `getAvailableSeatsBy${String(orderBy).charAt(0).toUpperCase() + String(orderBy).slice(1)}`;
        return new Promise((resolve, reject) => {
            pool.query("CALL ??(?)", [procedure, showID], (error, rows) => {
                if(error) { return reject(error); }
                if(rows[0].length > 0) {
                    return resolve(rows[0]);
                }
                else {
                    return reject("No available seats found");
                }
            });
        });
    }

    let response = undefined;
    try {
        if(event.showID == null) { throw ("Key 'showID' is required") }
        if(!await doesShowExist(event.showID)) {
            throw ("Show with id '" + event.showID + "' does not exist");
        }
        if(await isShowInPast(event.showID)) {
            throw ("Show has already started and tickets cannot be bought for it");
        }
        const orderByOptions = ["seatRow", "seatColumn", "price", "sectionType"]
        if(!orderByOptions.includes(event.orderBy)) {
            throw ("Invalid sorting criteria, must be one of 'seatRow', 'seatColumn', 'price', or 'sectionType'");
        }

        let availableSeats = await getAvailableSeats(event.showID, event.orderBy);

        response = {
            statusCode: 200,
            availableSeats
        }
    }
    catch(err) {
        response = {
            statusCode: 400,
            error: err
        }
    } finally {
        pool.end();
    }

    return response;
}
