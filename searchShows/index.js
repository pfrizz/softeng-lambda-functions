const db_access = require('/opt/nodejs/db_access');
const mysql = require('/opt/nodejs/node_modules/mysql');

exports.handler = async (event) => {
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    function searchActiveShows(queryType, query) {
        let procedure = `searchActiveShowsBy${String(queryType).charAt(0).toUpperCase() + String(queryType).slice(1)}`;
        return new Promise((resolve, reject) => {
            pool.query("CALL ??(?)", [procedure, query], (error, rows) => {
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

    let response = undefined;
    try {
        if(event.queryType !== "showName" && event.queryType !== "venueName") {
            throw ("Invalid query type, acceptable types are 'showName' or 'venueName'");
        }

        let result = await searchActiveShows(event.queryType, event.query);

        response = {
            statusCode: 200,
            result
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
