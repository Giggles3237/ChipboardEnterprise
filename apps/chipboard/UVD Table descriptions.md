UVD Table descriptions


mysql> describe keyperdata
    -> ;
+---------------------+-----------------+------+-----+-------------------+-----------------------------------------------+
| Field               | Type            | Null | Key | Default           | Extra                                         |
+---------------------+-----------------+------+-----+-------------------+-----------------------------------------------+
| my_row_id           | bigint unsigned | NO   | PRI | NULL              | auto_increment                                |
| StockNumber         | varchar(100)    | YES  | MUL | NULL              |                                               |
| Status              | varchar(50)     | YES  |     | NULL              |                                               |
| User                | varchar(100)    | YES  |     | NULL              |                                               |
| Checkout Local Time | varchar(50)     | YES  |     | NULL              |                                               |
| description         | text            | YES  |     | NULL              |                                               |
| removal_type        | varchar(50)     | YES  |     | NULL              |                                               |
| cabinet             | varchar(50)     | YES  |     | NULL              |                                               |
| system              | varchar(50)     | YES  |     | NULL              |                                               |
| location            | varchar(100)    | YES  |     | NULL              |                                               |
| reason              | varchar(200)    | YES  |     | NULL              |                                               |
| created_at          | timestamp       | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at          | timestamp       | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+---------------------+-----------------+------+-----+-------------------+-----------------------------------------------+
13 rows in set (0.07 sec)

mysql> SHOW TABLES;
+------------------------------+
| Tables_in_unifiedvehicledata |
+------------------------------+
| keyperdata                   |
| keyperdata_second_key        |
| latest_key_data              |
| latest_vehicle_summary       |
| materialized_vehicle_summary |
| temp_vehicle_data            |
| unified_vehicles             |
| unifiedvehicledata           |
| vehicles                     |
+------------------------------+
9 rows in set (0.04 sec)

mysql> DESCRIBE keyperdata_second_key;
+---------------------+-----------------+------+-----+---------+----------------+
| Field               | Type            | Null | Key | Default | Extra          |
+---------------------+-----------------+------+-----+---------+----------------+
| my_row_id           | bigint unsigned | NO   | PRI | NULL    | auto_increment |
| StockNumber         | varchar(100)    | NO   | MUL | NULL    |                |
| Status              | varchar(50)     | YES  |     | NULL    |                |
| User                | varchar(100)    | YES  |     | NULL    |                |
| Checkout Local Time | varchar(50)     | YES  |     | NULL    |                |
| description         | text            | YES  |     | NULL    |                |
| removal_type        | varchar(50)     | YES  |     | NULL    |                |
| cabinet             | varchar(100)    | YES  |     | NULL    |                |
| system              | varchar(100)    | YES  |     | NULL    |                |
| location            | varchar(100)    | YES  |     | NULL    |                |
| reason              | text            | YES  |     | NULL    |                |
+---------------------+-----------------+------+-----+---------+----------------+

mysql> DESCRIBE unifiedvehicledata;
+---------------+-----------------+------+-----+-------------------+-----------------------------------------------+
| Field         | Type            | Null | Key | Default           | Extra                                         |
+---------------+-----------------+------+-----+-------------------+-----------------------------------------------+
| my_row_id     | bigint unsigned | NO   | PRI | NULL              | auto_increment INVISIBLE                      |
| Stock #       | text            | YES  |     | NULL              |                                               |
| New/Used      | text            | YES  |     | NULL              |                                               |
| Certified     | text            | YES  |     | NULL              |                                               |
| Year          | bigint          | YES  |     | NULL              |                                               |
| Make          | text            | YES  |     | NULL              |                                               |
| Model         | text            | YES  |     | NULL              |                                               |
| Series        | text            | YES  |     | NULL              |                                               |
| Age           | text            | YES  |     | NULL              |                                               |
| Color         | text            | YES  |     | NULL              |                                               |
| Interior      | text            | YES  |     | NULL              |                                               |
| VIN           | text            | YES  |     | NULL              |                                               |
| Odometer      | text            | YES  |     | NULL              |                                               |
| Starred Equip | text            | YES  |     | NULL              |                                               |
| Report        | text            | YES  |     | NULL              |                                               |
| Recall        | text            | YES  |     | NULL              |                                               |
| Warnings      | text            | YES  |     | NULL              |                                               |
| Problems      | text            | YES  |     | NULL              |                                               |
| Recall Status | text            | YES  |     | NULL              |                                               |
| Tags          | text            | YES  |     | NULL              |                                               |
| vRank         | text            | YES  |     | NULL              |                                               |
| Price Rank    | text            | YES  |     | NULL              |                                               |
| Vin Leads     | bigint          | YES  |     | NULL              |                                               |
| Current Price | text            | YES  |     | NULL              |                                               |
| DIS           | text            | YES  |     | NULL              |                                               |
| DIR           | text            | YES  |     | NULL              |                                               |
| Recon Step    | varchar(50)     | YES  |     | NULL              |                                               |
| chassis       | varchar(50)     | YES  |     | NULL              |                                               |
| created_at    | timestamp       | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at    | timestamp       | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+---------------+-----------------+------+-----+-------------------+-----------------------------------------------+


mysql> SHOW CREATE VIEW latest_vehicle_summary;
+------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------+----------------------+
| View                   | Create View                                                                                                         
                                                                                                                                               
                                                                                                                                               
                                                                                                                                               
                                                                                                                                               
                                                                                                                                               
                                                                                                                                               
                                                   | character_set_client | collation_connection |
+------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------+----------------------+
| latest_vehicle_summary | CREATE ALGORITHM=UNDEFINED DEFINER=`clasko`@`%` SQL SECURITY DEFINER VIEW `latest_vehicle_summary` AS with `rankedvehicles` as (select `unifiedvehicledata`.`Stock #` AS `Stock #`,`unifiedvehicledata`.`New/Used` AS `New/Used`,`unifiedvehicledata`.`Certified` AS `Certified`,`unifiedvehicledata`.`Year` AS `Year`,`unifiedvehicledata`.`Make` AS `Make`,`unifiedvehicledata`.`Model` AS `Model`,`unifiedvehicledata`.`Series` AS `Series`,`unifiedvehicledata`.`Age` AS `Age`,`unifiedvehicledata`.`Color` AS `Color`,`unifiedvehicledata`.`Interior` AS `Interior`,`unifiedvehicledata`.`VIN` AS `VIN`,`unifiedvehicledata`.`Odometer` AS `Odometer`,`unifiedvehicledata`.`Starred Equip` AS `Starred Equip`,`unifiedvehicledata`.`Report` AS `Report`,`unifiedvehicledata`.`Recall` AS `Recall`,`unifiedvehicledata`.`Warnings` AS `Warnings`,`unifiedvehicledata`.`Problems` AS `Problems`,`unifiedvehicledata`.`Recall Status` AS `Recall Status`,`unifiedvehicledata`.`Tags` AS `Tags`,`unifiedvehicledata`.`vRank` AS `vRank`,`unifiedvehicledata`.`Price Rank` AS `Price Rank`,`unifiedvehicledata`.`Vin Leads` AS `Vin Leads`,`unifiedvehicledata`.`Current Price` AS `Current Price`,`unifiedvehicledata`.`DIS` AS `DIS`,`unifiedvehicledata`.`DIR` AS `DIR`,`unifiedvehicledata`.`Recon Step` AS `Recon Step`,`unifiedvehicledata`.`chassis` AS `chassis`,row_number() OVER (PARTITION BY `unifiedvehicledata`.`Stock #` ORDER BY `unifiedvehicledata`.`my_row_id` desc )  AS `row_num` from `unifiedvehicledata`) select `rankedvehicles`.`Stock #` AS `StockNumber`,`rankedvehicles`.`Year` AS `Year`,`rankedvehicles`.`Make` AS `Make`,`rankedvehicles`.`Model` AS `Model`,`rankedvehicles`.`VIN` AS `VIN`,`rankedvehicles`.`Color` AS `Color`,`rankedvehicles`.`Interior` AS `Interior`,`rankedvehicles`.`New/Used` AS `Status`,`rankedvehicles`.`Certified` AS `Certified`,`rankedvehicles`.`Series` AS `Series`,`rankedvehicles`.`Age` AS `Age`,`rankedvehicles`.`Odometer` AS `Odometer`,`rankedvehicles`.`Starred Equip` AS `Equipment`,`rankedvehicles`.`Report` AS `Report`,`rankedvehicles`.`Recall` AS `Recall`,`rankedvehicles`.`Warnings` AS `Warnings`,`rankedvehicles`.`Problems` AS `Problems`,`rankedvehicles`.`Recall Status` AS `RecallStatus`,`rankedvehicles`.`Tags` AS `Tags`,`rankedvehicles`.`vRank` AS `vRank`,`rankedvehicles`.`Price Rank` AS `PriceRank`,`rankedvehicles`.`Vin Leads` AS `VinLeads`,`rankedvehicles`.`Current Price` AS `Price`,`rankedvehicles`.`Recon Step` AS `ReconStatus`,`rankedvehicles`.`chassis` AS `Chassis` from `rankedvehicles` where (`rankedvehicles`.`row_num` = 1) | cp850                | cp850_general_ci     |
+------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------------+----------------------+

mysql> describe latest_vehicle_summary;
+--------------+-------------+------+-----+---------+-------+
| Field        | Type        | Null | Key | Default | Extra |
+--------------+-------------+------+-----+---------+-------+
| StockNumber  | varchar(20) | YES  |     | NULL    |       |
| Status       | mediumtext  | YES  |     | NULL    |       |
| Certified    | mediumtext  | YES  |     | NULL    |       |
| Year         | bigint      | YES  |     | NULL    |       |
| Make         | mediumtext  | YES  |     | NULL    |       |
| Model        | mediumtext  | YES  |     | NULL    |       |
| Series       | mediumtext  | YES  |     | NULL    |       |
| Age          | mediumtext  | YES  |     | NULL    |       |
| Color        | mediumtext  | YES  |     | NULL    |       |
| Interior     | mediumtext  | YES  |     | NULL    |       |
| VIN          | mediumtext  | YES  |     | NULL    |       |
| Odometer     | mediumtext  | YES  |     | NULL    |       |
| Equipment    | mediumtext  | YES  |     | NULL    |       |
| Report       | mediumtext  | YES  |     | NULL    |       |
| Recall       | mediumtext  | YES  |     | NULL    |       |
| Warnings     | mediumtext  | YES  |     | NULL    |       |
| Problems     | mediumtext  | YES  |     | NULL    |       |
| RecallStatus | mediumtext  | YES  |     | NULL    |       |
| Tags         | mediumtext  | YES  |     | NULL    |       |
| vRank        | mediumtext  | YES  |     | NULL    |       |
| PriceRank    | mediumtext  | YES  |     | NULL    |       |
| VinLeads     | bigint      | YES  |     | NULL    |       |
| Price        | mediumtext  | YES  |     | NULL    |       |
| ReconStatus  | varchar(50) | YES  |     | NULL    |       |
| Chassis      | varchar(50) | YES  |     | NULL    |       |
+--------------+-------------+------+-----+---------+-------+

mysql> SELECT * FROM latest_vehicle_summary WHERE StockNumber LIKE '%1305%';
+-------------+--------+-----------+------+------+----------------------+--------+------+---------------+----------+-------------------+----------+-----------+--------+--------+----------+----------+--------------+------+-------+-----------+----------+-------+-------------+---------+
| StockNumber | Status | Certified | Year | Make | Model                | Series | Age  | Color         | Interior | VIN               | Odometer | Equipment | Report | Recall | Warnings | Problems | RecallStatus | Tags | vRank | PriceRank | VinLeads | Price | ReconStatus | Chassis |
+-------------+--------+-----------+------+------+----------------------+--------+------+---------------+----------+-------------------+----------+-----------+--------+--------+----------+----------+--------------+------+-------+-----------+----------+-------+-------------+---------+
| PP1305      | Used   | NULL      | 2019 | BMW  | 7 Series 750i xDrive | NULL   | NULL | Gray Metallic | NULL     | WBA7F2C59KB240023 | 43625.0  | NULL      | NULL   | NULL   | NULL     | NULL     | NULL         | NULL | NULL  | NULL      |     NULL | NULL  | Wholesale   | NULL    |
+-------------+--------+-----------+------+------+----------------------+--------+------+---------------+----------+-------------------+----------+-----------+--------+--------+----------+----------+--------------+------+-------+-----------+----------+-------+-------------+---------+


This is the python script I use to upload the files to the database.
import os
import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import pandas as pd
import mysql.connector
from mysql.connector import errorcode

# Database connection information
DB_HOST = "sales-db.mysql.database.azure.com"
DB_NAME = "unifiedvehicledata"
DB_USER = "vehicles"
DB_PASSWORD = "results25"
DB_PORT = 3306
SSL_CERT_PATH = "C:/Users/chris/PythonProjects/UnifiedVehicleData/DigiCertGlobalRootCA.crt.pem"

# Define file-to-database mappings
FIELD_MAPPINGS = {
    "KeyPerData": {
        "name": "StockNumber",
        "Status": "Status",
        "User": "User",
        "Checkout Local Time": "Checkout Local Time",
        "description": "description",
        "Removal Type": "removal_type",
        "Cabinet": "cabinet",
        "System": "system",
        "Location": "location",
        "Reason": "reason"
    },
    "RapidReconData": {
        "Stock No.": "Stock #",
        "VIN": "VIN",
        "Year": "Year",
        "Make": "Make",
        "Model": "Model",
        "Exterior color": "Color",
        "ODO": "Odometer",
        "New/Used": "New/Used",
        "DIS": "DIS",
        "DIR": "DIR",
        "Step": "Recon Step",
        "Priority": "Priority",
        "Recall": "Recall",
        "Note": "Note"
    },
    "BMWDAR Data": {
        "Prod No": "Stock #",
        "Chassis No": "chassis",
        "Vin": "VIN",
        "Model Year": "Year",
        "Na Model Code Desc": "Model",
        "Color": "Color",
        "Status": "Recon Step"
    },
    "vAuto Export": {
        "Stock #": "Stock #",
        "New/Used": "New/Used",
        "Certified": "Certified",
        "Year": "Year",
        "Make": "Make",
        "Model": "Model",
        "Series": "Series",
        "Age": "Age",
        "Color": "Color",
        "Interior": "Interior",
        "VIN": "VIN",
        "Odometer": "Odometer",
        "Starred Equip": "Starred Equip",
        "Carfax Has\nReport": "Report",
        "Carfax Has\nManufacturer\nRecall": "Recall",
        "Carfax Has\nWarnings": "Warnings",
        "Carfax Has\nProblems": "Problems",
        "Recall Status": "Recall Status",
        "Tags": "Tags",
        "vRank": "vRank",
        "Price Rank": "Price Rank",
        "Vin Leads": "Vin Leads",
        "Current Price": "Current Price"
    }
}

def connect_to_db():
    """Establish a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
            ssl_ca=SSL_CERT_PATH,
        )
        return conn
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            messagebox.showerror("Database Error", "Invalid credentials.")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            messagebox.showerror("Database Error", "Database does not exist.")
        else:
            messagebox.showerror("Database Error", str(err))
        return None

def process_file(file_path, file_type, conn, progress_label, progress_bar, root):
    """Process the file and upload data to the database."""
    try:
        progress_label.config(text=f"Processing {os.path.basename(file_path)}...")
        progress_bar['value'] = 0
        
        # Read CSV with string handling for NA values
        df = pd.read_csv(file_path, na_values=['', 'NA', 'NULL', 'NaN'], keep_default_na=True)
        total_rows = len(df)
        
        mapping = FIELD_MAPPINGS[file_type]
        
        # Rename columns based on mapping
        df.rename(columns=mapping, inplace=True)
        
        # Keep only mapped columns
        df = df[[col for col in mapping.values() if col in df.columns]]
        
        # Improved null value handling
        df = df.replace({pd.NA: None})
        df = df.astype(object).where(pd.notnull(df), None)
        
        cursor = conn.cursor()

        # Process in batches of 100 for better performance
        batch_size = 100
        for start_idx in range(0, len(df), batch_size):
            end_idx = min(start_idx + batch_size, len(df))
            batch_df = df.iloc[start_idx:end_idx]
            
            progress = int(end_idx / total_rows * 100)
            progress_bar['value'] = progress
            progress_label.config(text=f"Processing {os.path.basename(file_path)}: {progress}%")
            root.update_idletasks()

            for _, row in batch_df.iterrows():
                row_dict = {}
                for column, value in row.items():
                    if pd.isna(value) or value == '' or value == 'NULL':
                        row_dict[column] = None
                    else:
                        row_dict[column] = str(value) if not isinstance(value, (int, float)) else value

                if file_type == "KeyPerData":
                    stock_num = str(row_dict.get("StockNumber", "")).split('.')[0]
                    
                    if '.2' in str(row_dict.get("StockNumber", "")):
                        # Process second key
                        query = """
                            INSERT INTO keyperdata_second_key 
                            (StockNumber, Status, User, `Checkout Local Time`, description, 
                            removal_type, cabinet, `system`, location, reason)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE 
                            Status=VALUES(Status),
                            User=VALUES(User),
                            `Checkout Local Time`=VALUES(`Checkout Local Time`),
                            description=VALUES(description),
                            removal_type=VALUES(removal_type),
                            cabinet=VALUES(cabinet),
                            `system`=VALUES(`system`),
                            location=VALUES(location),
                            reason=VALUES(reason)
                        """
                        cursor.execute(query, (
                            stock_num,
                            row_dict.get("Status"),
                            row_dict.get("User"),
                            row_dict.get("Checkout Local Time"),
                            row_dict.get("description"),
                            row_dict.get("removal_type"),
                            row_dict.get("cabinet"),
                            row_dict.get("system"),
                            row_dict.get("location"),
                            row_dict.get("reason")
                        ))
                    else:
                        # Process first key
                        query = """
                            INSERT INTO keyperdata 
                            (StockNumber, Status, User, `Checkout Local Time`, description, 
                            removal_type, cabinet, `system`, location, reason)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE 
                            Status=VALUES(Status),
                            User=VALUES(User),
                            `Checkout Local Time`=VALUES(`Checkout Local Time`),
                            description=VALUES(description),
                            removal_type=VALUES(removal_type),
                            cabinet=VALUES(cabinet),
                            `system`=VALUES(`system`),
                            location=VALUES(location),
                            reason=VALUES(reason)
                        """
                        cursor.execute(query, (
                            stock_num,
                            row_dict.get("Status"),
                            row_dict.get("User"),
                            row_dict.get("Checkout Local Time"),
                            row_dict.get("description"),
                            row_dict.get("removal_type"),
                            row_dict.get("cabinet"),
                            row_dict.get("system"),
                            row_dict.get("location"),
                            row_dict.get("reason")
                        ))
                else:
                    # Original code for other file types
                    fields = []
                    values = []
                    updates = []
                    
                    fields.append("`Stock #`")
                    values.append(row_dict.get("Stock #"))
                    
                    for field in ["VIN", "Year", "Make", "Model", "Color", "Odometer", "Recon Step", "chassis"]:
                        if field in row_dict and row_dict[field] is not None:
                            fields.append(f"`{field}`")
                            values.append(row_dict[field])
                            updates.append(f"`{field}`=VALUES(`{field}`)")
                    
                    if updates:
                        placeholders = ', '.join(['%s'] * len(values))
                        query = f"""
                            INSERT INTO unifiedvehicledata 
                            ({', '.join(fields)})
                            VALUES ({placeholders})
                            ON DUPLICATE KEY UPDATE
                            {', '.join(updates)}
                        """
                        cursor.execute(query, values)

            conn.commit()  # Commit after each batch

        cursor.close()
        progress_label.config(text=f"Completed {os.path.basename(file_path)}")
        messagebox.showinfo("Success", f"File '{os.path.basename(file_path)}' processed successfully.")
        
    except Exception as e:
        progress_label.config(text=f"Error processing {os.path.basename(file_path)}")
        messagebox.showerror("Error", f"Failed to process file: {str(e)}")

# GUI for file selection and processing
def main_gui():
    def select_files():
        file_paths = filedialog.askopenfilenames(filetypes=[("CSV Files", "*.csv")])
        if file_paths:
            for file_path in file_paths:
                file_listbox.insert(tk.END, file_path)

    def process_files():
        file_type = file_type_dropdown.get()
        if not file_type:
            messagebox.showerror("Error", "Please select a file type.")
            return

        conn = connect_to_db()
        if not conn:
            return

        total_files = file_listbox.size()
        for i in range(total_files):
            file_path = file_listbox.get(i)
            progress_label.config(text=f"Processing file {i+1} of {total_files}")
            process_file(file_path, file_type, conn, progress_label, progress_bar, root)

        progress_label.config(text="All files processed")
        conn.close()

    def clear_files():
        file_listbox.delete(0, tk.END)  # Clear all items from listbox

    root = tk.Tk()
    root.title("File Upload")

    tk.Label(root, text="Select File Type:").pack(pady=5)
    file_type_dropdown = ttk.Combobox(root, values=list(FIELD_MAPPINGS.keys()))
    file_type_dropdown.pack(pady=5)

    tk.Button(root, text="Select Files", command=select_files).pack(pady=5)

    file_listbox = tk.Listbox(root, selectmode=tk.MULTIPLE, width=80, height=10)
    file_listbox.pack(pady=5)

    # Add progress bar and label
    progress_label = tk.Label(root, text="Ready to process files...")
    progress_label.pack(pady=5)
    
    progress_bar = ttk.Progressbar(
        root,
        orient='horizontal',
        mode='determinate',
        length=300
    )
    progress_bar.pack(pady=5)

    # Button frame
    button_frame = tk.Frame(root)
    button_frame.pack(pady=10)
    
    tk.Button(button_frame, text="Process Files", command=process_files).pack(side=tk.LEFT, padx=5)
    tk.Button(button_frame, text="Clear Files", command=clear_files).pack(side=tk.LEFT, padx=5)

    root.mainloop()

if __name__ == "__main__":
    main_gui()
