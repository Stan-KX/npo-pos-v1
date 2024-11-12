from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_from_directory
import pandas as pd
import os
from datetime import datetime,date
from functools import wraps

app = Flask(__name__)
secret_key = os.urandom(24)
app.secret_key = secret_key

clients_df = pd.read_csv('data/clients.csv').dropna()
items_df = pd.read_csv('data/items.csv').dropna()
transactions_df = pd.read_csv('data/transactions.csv').dropna()
users_df = pd.read_csv('data/users.csv')

def generate_items_dict():
    DisplayName=items_df['DisplayName'].tolist()
    ItemsPrice=items_df['ItemPrice'].tolist()
    ItemsImage=items_df['ItemImage'].tolist()
    items_dict = [
    {"name": name, "image": image, "price": price}
    for name, image, price in zip(DisplayName, ItemsImage, ItemsPrice)
]
    return items_dict

USERNAMES = users_df['Username'].tolist()
ITEMS = generate_items_dict()
NRIC = clients_df['NRIC'].tolist()

def login_required(func):
    @wraps(func)
    def secure_function(*args, **kwargs):
        if "user" not in session:
            print("User not in session, redirecting to login.")
            return redirect(url_for("login"))
        print("User is in session.")
        return func(*args, **kwargs)
    return secure_function

@app.route('/', methods=['GET', "POST"])
def index():
    return redirect(url_for("login"))

@app.route('/login', methods=['GET', "POST"])
def login():
    session.pop('user', None)
    print('session user popped')    
    if request.method == "POST":
        username = request.form.get('username')
        if username:
            username = username.capitalize()
            session['user'] = username
            print(f'User has logged in: {username}')
            if username in USERNAMES:
                print(f'Username {username} found in USERNAMES')
                return redirect(url_for('mainpage'))
            else:
                print(f'Username {username} not found in USERNAMES')
        else:
            print('No username provided')
    return render_template('login.html')

@app.route('/mainpage', methods = ['GET', 'POST'])
@login_required
def mainpage():
    return render_template('mainpage.html', items = ITEMS)

# Queries for client's UIN, and if client is valid, returns client details
@app.route('/query', methods = ['GET', 'POST'])
def update_status():
    message = ""
    if request.method == "POST":
        nric = request.form.get('nric', '').upper().strip()
        if nric in NRIC:
            validity = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'Validity']
            client_name = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'ClientName']
            client_dob = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'DOB']
            client_yob = datetime.strptime(client_dob, "%d/%m/%Y").year
            current_date = datetime.now().date().year
            client_age = int(current_date - client_yob)
            if validity == 'Yes':
                message = f"{client_name}"
                session['nric'] = nric       # Stores the request-cycle NRIC in flask's current session
                response = jsonify({'message': message, 'age': client_age})
                print(f"{session['user']} queried: {message}")
            else:
                message = f"{client_name} has already redeemed. Please enter new NRIC."
                response = jsonify({'message': message})
                print(f'{session['user']} queried {nric}: {message}')
        else:
            message = f"NRIC not found. Please enter new NRIC."
            response = jsonify({'message': message})
            print(f'{session['user']} queried {nric}: {message}')
    return response
    

@app.route('/check-out', methods = ['GET', 'POST'])
def check_out():
    try:
        data = request.json['data']
        summary = [
            {
                "ItemName": items_df.at[items_df.index[items_df['DisplayName'] == entry['ItemName']][0], 'ItemName'], 
                "ItemQuantity": int(entry['ItemQuantity']), 
                "TotalPrice": int(entry['TotalPrice']),
                "TotalSpent": int(entry['TotalSpent'])
            }
            for entry in data
            ]
        print(f'{session['user']} attempting to check out: {summary}')

        update_transaction_log(summary) # Update transaction log with the data
        
        return jsonify({'message': 'Transaction processed successfully!'})
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'message': 'Error processing transaction'}), 500

def update_transaction_log(summary):
    global transactions_df 
    global clients_df
    nric = session.get('nric')
    if 'TransactionID' not in transactions_df.columns or transactions_df['TransactionID'].dropna().empty:
        transaction_id = 1
    else:
        transaction_id = transactions_df['TransactionID'].dropna().iloc[-1] + 1

    new_transactions = pd.DataFrame(summary)        # Create a DataFrame from the new data
    new_transactions['TransactionID'] = transaction_id
    new_transactions['NRIC'] = nric
    new_transactions['ClientName'] = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'ClientName']
    new_transactions['TransactionDate'] = date.today()

    # Concatenate the new data with the existing DataFrames
    transactions_df = pd.concat([transactions_df, new_transactions], ignore_index=True)
    # clients_df.loc[clients_df.index[clients_df['NRIC'] == nric], 'Validity'] = 'No'        #Updates client Validity to 'No' after redemption
    clients_df.to_csv('data/clients.csv', index=False)
    
    # Save updated DataFrame back to CSV
    transactions_df.to_csv('data/transactions.csv', index=False)
    print(f'Check-out processed for {session['nric']}')
    session['nric'] = ""
    

@app.route('/admin', methods = ['GET', 'POST'])
@login_required
def admin():
    return render_template('admin.html')

@app.route('/download_csv')
def download_csv():
    # Path to the directory containing the CSV file
    directory = 'data'
    # Name of the CSV file
    filename = 'transactions.csv'
    print(f'{session['user']} downloaded transactions.csv')
    return send_from_directory(directory, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=False, port=5000)
