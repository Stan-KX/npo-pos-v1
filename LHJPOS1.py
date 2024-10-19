from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import pandas as pd
import os
from datetime import date

app = Flask(__name__)
secret_key = os.urandom(24)
app.secret_key = secret_key

clients_df = pd.read_csv('data/clients.csv').dropna()
items_df = pd.read_csv('data/items.csv').dropna()
transactions_df = pd.read_csv('data/transactions.csv').dropna()

USERNAMES = [""]    #For basic user authentication at index(0)
ITEMS = items_df['ItemName'].tolist()
NRIC = clients_df['NRIC'].tolist()

@app.route('/', methods=['GET', "POST"])
def index():
    return redirect(url_for('mainpage'))

    # if request.method == "POST":
    #     username = request.form.get('username')
    #     if username in USERNAMES:
    #         return redirect(url_for('mainpage'))
    # return render_template('index.html')

@app.route('/mainpage', methods = ['GET', 'POST'])
def mainpage():
    return render_template('mainpage.html', items = ITEMS)

#Updates client status bar depending on client validity in clients.csv    
@app.route('/status-text', methods = ['GET', 'POST'])
def update_status():
    message = ""
    if request.method == "POST":
        nric = request.form.get('nric', '').upper().strip()
        if nric in NRIC:
            validity = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'Validity']
            clientname = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'ClientName']
            if validity == 'Yes':
                message = f"Currently Serving: {clientname}"
                color = 'green'
                session['nric'] = nric       # Stores the request-cycle NRIC in flask's current session
                response = jsonify({'message': message, 'color': color})
            else:
                message = f"{clientname} has already redeemed. Please enter new NRIC."
                color = 'red'
                response = jsonify({'message': message, 'color': color})
        else:
            message = f"NRIC not found. Please enter new NRIC."
            color = 'red'
            response = jsonify({'message': message, 'color': color})
    return response
    


@app.route('/check-out', methods = ['GET', 'POST'])
# Retrieves transaction data from client
def check_out():
    try:
        data = request.json['data']
        update_transaction_log(data) 
        return jsonify({'message': 'Transaction processed successfully!'})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'message': 'Error processing transaction'}), 500
    
# Updates transaction.csv with the transaction data
def update_transaction_log(data):
    global transactions_df 
    global clients_df
    nric = session.get('nric')
    if 'TransactionID' not in transactions_df.columns or transactions_df['TransactionID'].dropna().empty:
        transaction_id = 1
    else:
        transaction_id = transactions_df['TransactionID'].dropna().iloc[-1] + 1

    new_transactions = pd.DataFrame(data)        # Create a DataFrame from the new data
    new_transactions['TransactionID'] = transaction_id
    new_transactions['NRIC'] = nric
    new_transactions['ClientName'] = clients_df.at[clients_df.index[clients_df['NRIC'] == nric][0], 'ClientName']
    new_transactions['TransactionDate'] = date.today()

    # Concatenate the new data with the existing DataFrames
    transactions_df = pd.concat([transactions_df, new_transactions], ignore_index=True)
    clients_df.loc[clients_df.index[clients_df['NRIC'] == nric], 'Validity'] = 'No'        #Updates client Validity to 'No' after redemption
    clients_df.to_csv('data/clients.csv', index=False)
    
    # Save updated DataFrame back to CSV
    transactions_df.to_csv('data/transactions.csv', index=False)

@app.route('/get-price')
def get_price():
    ItemsName=items_df['ItemName'].tolist()
    ItemsPrice=items_df['ItemPrice'].tolist()
    pricelist = {item:price for item,price in zip(ItemsName,ItemsPrice)}
    return jsonify(pricelist)



if __name__ == '__main__':
    app.run(debug=True, port=5000)
