/* eslint-disable react-hooks/rules-of-hooks */
const leveldown = require("leveldown");
const fs = require("fs");

/**
 * This callback is displayed as a global member.
 * @callback useLevelDbCallback
 * @param {Db} db
 */

/////////////////////////

/**
 * The LevelDb Async Wrapper
 */
class Db {
  constructor(db) {
    this.db = db;
  }

  /**
   *
   * @param {string} dbPath
   * @param {useLevelDbCallback} asyncCallback
   */
  static async useLevelDb(dbPath, asyncCallback = defaultCallback) {
    console.log(`[${new Date().toISOString()}] Opening DB ${dbPath}`)
    var db = leveldown(dbPath);
    await new Promise((resolve, reject) => {
      db.open({}, async function (err) {
        if (err) reject(err);
        console.log(`[${new Date().toISOString()}] Opened DB ${dbPath}`)
        await asyncCallback(new Db(db)).catch((err) => reject(err));
        resolve();
      });
    });
    await new Promise((resolve, reject) => {
      console.log(`[${new Date().toISOString()}] Closing DB ${dbPath}`)
      db.close(function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`[${new Date().toISOString()}] Closed DB ${dbPath}`)
          resolve();
        }
      });
    });
  }

  async put(key, value, options = {}) {
    return await callbackToPromise(
      this.db.put.bind(this.db, key, value, options)
    );
  }
  async get(key, options = {}) {
    return await callbackToPromise(this.db.get.bind(this.db, key, options));
  }
  async getMany(keys, options = {}) {
    return await callbackToPromise(
      this.db.getMany.bind(this.db, keys, options)
    );
  }
  async del(key, options = {}) {
    return await callbackToPromise(this.db.del.bind(this.db, key, options));
  }

  async exists(key) {
    try {
      await this.get(key);
      return true;
    } catch (error) {
      if (error.message.indexOf("NotFound") >= 0) {
        return false;
      } else {
        throw error;
      }
    }
  }


  static async moveHtmlFilesToDb(dbPath, htmlFiles, keys) {
    await Db.useLevelDb(dbPath, async (db) => {
      let moved = 0;
      for (let i = 0; i < htmlFiles.length; i++) {
        if (fs.existsSync(htmlFiles[i])) {
          await db.put(keys[i], fs.readFileSync(htmlFiles[i]));
          fs.unlinkSync(htmlFiles[i]);
          moved++;
        }
        if (i % 100 === 0) console.log("Moved record #" + i);
      }
      console.log(`Migration Done (${moved}/${keys.length} records moved)`);
    });
  }

}

async function callbackToPromise(func) {
  return new Promise((resolve, reject) => {
    func((err, ...values) => {
      if (err) reject(err);
      else resolve(values);
    });
  });
}

module.exports = Db;
