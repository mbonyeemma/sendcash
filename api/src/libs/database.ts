import * as db from './db.helper';
class BaseModel {
  public tableName: string;
  public insertion: string | undefined;
  public selectCols: string | undefined;
  public selectWhere: string = '';
  public offsets: number = 0;
  public limits: number = 10;
  public orderBy: string = '';
  public orderIs: string = '';
  public updation: string | undefined;
  public fileId: any;
  public updateWhere: string = '';
  public insertPrimaryKey: string | undefined;
  constructor(value: string = '') {
    this.tableName = value;

  }
  public inserRecords() {
    // tslint:disable-next-line:max-line-length
    const query =
      'CALL insertData("' + this.tableName + '","' + this.insertion + '");';
    //console.log(query)
    const result = db.default.pdo(query);
    return result;
  }

  public getRecords() {
    // tslint:disable-next-line:max-line-length
    const query = 'CALL getFile("' + this.fileId + '");';
    const result = db.default.pdo(query);
    return result;
  }
  public deleteDocsBeforeUpload(kycId: string) {
    return new Promise((resolve) => {
      this.callQuery(`call deleteDocsBeforeInsert('${kycId}');`).then(
        (res: any) => {
          resolve(res);
        },
        () => {
          resolve(false);
        },
      );
    });
  }
  public deleteData(table: string, where: string = '') {
    const query = 'CALL deleteFile();';
    const result = db.default.pdo(query);
    this.fileId = '';
    return result;
  }
  public async selectRecords() {
    const query =
      'call SelectData("' +
      this.selectCols +
      '","' +
      this.tableName +
      '","' +
      this.selectWhere +
      '",' +
      this.offsets +
      ',' +
      this.limits +
      ',"' +
      this.orderBy +
      '","' +
      this.orderIs +
      '");';
    const result = await db.default.pdo(query);
    this.resetSelectSettings();
    return result;
  }

  public async updateRecords() {
    // tslint:disable-next-line:max-line-length
    const query =
      'call updateData("' + this.tableName + '","' + this.updation + '","' + this.updateWhere + '");';
    const result = await db.default.pdo(query);
    return result;
  }
  public async callQuery(query: string, connType: string = 'normal') {
    try {
      console.log("callQuery", query)

      const result = await db.default.pdo(query, [], connType);
      this.resetSelectSettings();
      return result;
    } catch (error) {
      //console.log("ERROR", error)
      return []
    }
  }

  public async selectDataQuery(tableName: string, condition: string = "", limit: number = 100) {
    try {

      const whereClause = condition ? `WHERE ${condition}` : "";
      const query = `SELECT * FROM ${tableName} ${whereClause} LIMIT ${limit}`;
      console.log(query)
      const result = await this.callRawQuery(query);
      this.resetSelectSettings();
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.log("ERROR", error)
      return []
    }
  }



  public async callRawQuery(query: string) {
    try {
      console.log("RAWQUERY===>", query)
      const result = await db.default.pdo(query, [], 'normal');
      if (!Array.isArray(result)) {
        return [result];
      }
      return result;
    } catch (error) {
      console.log(error)
      return []
    }
  }

  private resetSelectSettings() {
    this.selectWhere = '';
    this.orderBy = '';
    this.orderIs = '';
    this.selectCols = '';
    this.offsets = 0;
  }


  public async updateData(table: string, where: string, data: any) {
    return new Promise(async (resolve, reject) => {
      this.tableName = table;
      this.updateWhere = where;

      const keys = Object.keys(data);
      const values = Object.values(data);

      // Constructing the update part of the query
      const updates = keys.map((key, index) => `${key} = ?`).join(', ');

      // Construct the full SQL update query
      const query = `UPDATE ${table} SET ${updates} WHERE ${where}`;
      console.log("query", query, values);

      try {
        const result = await db.default.pdo(query, values);
        //console.log("DBUPDATE==>", result);
        resolve(true); // Resolve with true on successful update
      } catch (error) {
        //console.log('Error updating data:', error);
        reject(error); // Reject the promise in case of an error
      }
    });
  }



  public async insertData(table: string, data: any) {
    this.tableName = table;
    const keys = Object.keys(data);
    const values: any = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    console.log("insertData", query)
    try {
      const result: any = await db.default.pdo(query, values);
      const lastId = result.insertId; // This line gets the last inserted ID
      return lastId
    } catch (error: any) {
      console.log('DBINSERTERROR=======>', error);
      // throw new Error("Error inserting data ")
      return false

    }

  }


  public async checkAndAddColumn(tableName: string, columnName: string): Promise<void> {
    const columnType = 'VARCHAR(100)';
    const columnExists = await this.checkColumnExists(tableName, columnName);

    if (!columnExists) {
      // Add the column if it doesn't exist
      await this.addColumn(tableName, columnName, columnType);
    }
  }

  private async checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      // Query to check if the column exists in the table
      const query = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}'`;

      // Execute the query
      const result: any = await db.default.pdo(query);

      // If the result contains any rows, the column exists
      return result.length > 0;
    } catch (error) {
      // Log or handle the error
      console.error('Error checking column existence:', error);
      return false;
    }
  }

  private async addColumn(tableName: string, columnName: string, columnType: string): Promise<void> {
    try {
      // Query to add a new column to the table
      const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;

      // Execute the query
      await db.default.pdo(query);

      // Log success or perform any other action
      console.log(`Column '${columnName}' added to table '${tableName}'`);
    } catch (error) {
      // Log or handle the error
      console.error('Error adding column:', error);
    }
  }


  public async beginTransaction() {
    try {
      await db.default.pdo('START TRANSACTION;');
    } catch (error) {
      console.error("Error starting transaction:", error);
      throw error;
    }
  }

  public async commitTransaction() {
    try {
      await db.default.pdo('COMMIT;');
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    }
  }

  public async rollbackTransaction() {
    try {
      await db.default.pdo('ROLLBACK;');
    } catch (error) {
      console.error("Error rolling back transaction:", error);
      throw error;
    }
  }
}

export default BaseModel;
