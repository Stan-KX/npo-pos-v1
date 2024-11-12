// Variables
const baseHardLimit = 36;
const baseSoftLimit = 35;
let hardLimit = baseHardLimit;
let softLimit = baseSoftLimit;
let itemLimit = 2;


// Function to reset limits to base values
function resetLimits() {
    hardLimit = baseHardLimit;
    softLimit = baseSoftLimit;
}

// 1) To perform AJAX request upon NRIC query button press
function nricQuery(event) {
    if (event) {
        event.preventDefault();
    }
    resetLimits();
    $.post({
        url: '/query',
        data: $('#nric-form').serialize(),
        success: function(data) {  
            if (data.message.includes('new')) {
                updateStatusText(`${data.message}`, 'error');    
                console.log(data.age);                              
            } else {
                if (data.age >= 60) {
                    hardLimit += 15;
                    softLimit += 15;
                }
                document.getElementById("checkout-button").disabled = false; // Enables checkout button if NRIC is valid
                document.querySelector(".product-container").style.border = '5px solid #4CAF50';
                document.querySelector(".form-container").style.border = 'none';
                document.querySelector("#client-name").innerText = `Client: ${data.message}\n Available Credit: ${softLimit} tokens`;
                updateStatusText(`Client found: ${data.message}`, 'success');
            }
        }
    });
    return false; // Ensure the function returns false to prevent default form submission
}



// 2) Function to update status text
function updateStatusText(message, className) {
    const statusTextElement = document.querySelector("#status-text");
    if (statusTextElement) {
        statusTextElement.className = `status-text ${className}`;
        statusTextElement.innerText = message;
    }
}


// 2) Enables quantity selectors, validates 0-2, calls updateTotal() 
document.addEventListener('DOMContentLoaded', () => {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const quantityElement = card.querySelector('.product-quantity');
        const decreaseButton = card.querySelector('.quantity-decrease');
        const increaseButton = card.querySelector('.quantity-increase');
        const price = parseFloat(card.querySelector('.product-price').textContent.replace('$', ''));

        let quantity = parseInt(quantityElement.textContent, 10);

        decreaseButton.addEventListener('click', () => {
            if (quantity > 0) {
                quantity--;
                quantityElement.textContent = quantity;
                updateTotal();
                updateCart();
                cardBorder();
            }
        });

        increaseButton.addEventListener('click', () => {
            if (quantity < itemLimit) {
                quantity++;
                quantityElement.textContent = quantity;
                updateTotal();
                updateCart();
                cardBorder();
            }
        });

        // Add event listener to the query button to reset quantities
        document.getElementById('query-btn').addEventListener('click', () => {
            quantity = 0;
            quantityElement.textContent = quantity;
        });
    });
});


function cardBorder() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const quantityElement = card.querySelector('.product-quantity');
        const quantity = parseInt(quantityElement.textContent, 10);
        
        if (quantity !== 0) {
            card.style.border = '2px solid green';
        } else {
            card.style.border = ''; // Reset border if quantity is 0
        }
    });
}


// 3) Updates the total counter based on quantity*price, counter color to red if > soft limit
function updateTotal() {
    let total = 0;
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const quantity = parseInt(card.querySelector('.product-quantity').textContent, 10);
        const price = parseFloat(card.querySelector('.product-price').textContent.replace(' tokens', ''));
        total += quantity * price;
    });

    const totalCounter = document.querySelector('#total-counter');
    totalCounter.innerText = `Total: ${total.toFixed(0)} tokens`;

    if (total > softLimit) {
        totalCounter.style.backgroundColor = 'red';
    } else {
        totalCounter.style.backgroundColor = ''; // Reset to default if total is not greater than spending limit
    }
}

// 4) Updates the shopping cart based on what was selected
function updateCart() {
    let transactionData = []; // Initialize transaction data array

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const quantity = parseInt(card.querySelector('.product-quantity').textContent, 10);
        const price = parseFloat(card.querySelector('.product-price').textContent.replace(' tokens', ''));
        const item = card.querySelector('.product-name').textContent;
        const total = quantity * price;

        if (quantity > 0) {
            transactionData.push({
                "Item Name": item,
                "Item Quantity": quantity,
                "Item Price": price,
                "Total": total
            });
        }
    });
    const transactionLog = document.getElementById('transaction-log');
    transactionLog.innerHTML = ''; // Clear previous log

    transactionData.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = 'transaction-entry';

        const itemName = document.createElement('span');
        itemName.className = 'item-name';
        itemName.textContent = `${entry["Item Name"]}`;

        const itemPrice = document.createElement('span');
        itemPrice.className = 'item-price';
        itemPrice.textContent = `${entry["Item Price"]} token/unit`;

        const itemQuantity = document.createElement('span');
        itemQuantity.className = 'item-quantity';
        itemQuantity.textContent = `Qty: ${entry["Item Quantity"]}`;
        
        const itemTotal=document.createElement('span');
        itemTotal.className = 'item-total'
        itemTotal.textContent = `Total: ${entry["Total"]} tokens`;

        logEntry.appendChild(itemName);
        logEntry.appendChild(itemPrice);
        logEntry.appendChild(itemQuantity);
        logEntry.appendChild(itemTotal);

        transactionLog.appendChild(logEntry);
    });
} 

function clearCart() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const quantityElement = card.querySelector('.product-quantity');
        quantityElement.textContent = '0'; // Set the quantity to 0
    });
    updateCart();
    updateTotal();
    document.querySelector("#client-name").innerText = ``;
}

// Processes the transaction submission. Sends transaction details to server.
function checkOut() {
    const total = parseFloat(document.querySelector('#total-counter').textContent.replace('Total: ', '').replace(' tokens', ''));
    console.log(total)
    if (total > hardLimit) {
        alert(`Transaction blocked: Total price exceeds the limit of $${softLimit}. Please remove some items.`);
    } else {

    const userConfirmed = confirm(`Confirm Transaction? Client may purchase an additional ${softLimit-total} tokens worth of items.`);
    
    if (userConfirmed) {
        const productCards = document.querySelectorAll('.product-card');
        let checkoutList = [];

        // transaction details
        productCards.forEach(card => {
            const quantity = parseInt(card.querySelector('.product-quantity').textContent, 10);
            const price = parseFloat(card.querySelector('.product-price').textContent.replace(' tokens', ''));
            const item = card.querySelector('.product-name').textContent
            const itemtotal = quantity * price;

            if(quantity >0) {
                checkoutList.push({
                    ItemName: item, 
                    ItemQuantity:quantity, 
                    TotalPrice: itemtotal,
                    TotalSpent: total})
            }
        });

        const data = checkoutList
        const clientname = document.querySelector("#client-name").innerText

        console.log("Data to be sent:", data); // Debugging log

        // Sends the data (checkoutList) to server
        fetch('/check-out', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            document.getElementById("checkout-button").disabled = true;
            document.querySelector(".product-container").style.border = '';
            document.querySelector(".form-container").style.border = '';
            document.getElementById('nric-input').value = '';
            alert(`Transaction successfully processed. Input another NRIC to conduct new transaction.`);
            document.getElementById('nric-input').focus();
            clearCart();
            cardBorder();
            updateStatusText(`Please input client NRIC.`, 'error');
        })
        .catch(error => {
            console.error('Error processing check-out:', error);
        });

    } else {
        console.log("Transaction was cancelled by the user.");
    }
}}    

function downloadTransactions() {
    fetch('/download_csv')
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'transactions.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error downloading the CSV:', error));
}
