const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access')

exports.handler = async (event) => {
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    function doSeatsExist(seatIDs) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM (SELECT COUNT(*) AS numMatching FROM Seats WHERE seatID IN (?)) WHERE numMatching=?",
                [seatIDs, seatIDs.length], (error, rows) => {
                    if(error) { return reject(error); }
                    let doExist = rows.length > 0;
                    return resolve(doExist);
                });
        });
    }

    function areSeatsAvailable(seatIDs) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM (SELECT COUNT(*) AS numMatching FROM Seats WHERE seatID IN (?) AND seatState='AVAILABLE') WHERE numMatching=?",
                [seatIDs, seatIDs.length], (error, rows) => {
                    if(error) { return reject(error); }
                    let areAvailable = rows.length > 0;
                    return resolve(areAvailable);
                });
        });
    }

    function isShowInPast(showID) {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=? AND showDatetime < CONVERT_TZ(NOW(), 'UTC', 'US/Eastern')",
                [showID], (error, rows) => {
                    if(error) { return reject(error); }
                    let isInPast = rows.length > 0;
                    return resolve(isInPast);
                });
        });
    }

    function buySeats(seatIDs) {
        return new Promise((resolve, reject) => {
            pool.query("UPDATE Seats SET seatState='SOLD' WHERE seatID IN (?)", [seatIDs], (error, rows) => {
                if(error) { return reject(error); }
                return resolve();
            });
        });
    }

    let response = undefined;
    try {
        if(await isShowInPast(event.showID)) { throw ("Show is in the past and seats cannot be bought") }
        if(event.selectedSeats == null) { throw ("Key 'selectedSeats' is required") }
        if(!await doSeatsExist(event.selectedSeats)) { throw ("Not all selected seats exist") }
        if(!await areSeatsAvailable(event.selectedSeats)) { throw ("Not all selected seats are available") }

        await buySeats(event.selectedSeats);

        response = {
            statusCode: 200
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
