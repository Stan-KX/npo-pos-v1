let itemPrices = {};


function checkOut() {
    const totalprice = parseFloat(document.querySelector('#total-counter').getAttribute('data-total'));
    console.log(totalprice)
    if (totalprice > 32) {
        alert('Transaction blocked: Total price exceeds the limit of $32. Please remove some items.');
    } else {

    const userConfirmed = confirm("Confirm Transaction? Transaction cannot be reversed");
    
    if (userConfirmed) {
        const checkoutitems = document.querySelectorAll('.checkoutitem');
        const quantities = document.querySelectorAll('.quantity');
        const prices = document.querySelectorAll('.price');
        const totalprice = parseFloat(document.querySelector('#total-counter').getAttribute('data-total'))

        const data = Array.from(checkoutitems).map((item, index) => ({
            ItemName: item.value,
            ItemQuantity: quantities[index].value,
            TotalPrice: totalprice
        }));

        console.log("Data to be sent:", data); // Debugging log

        // Reflect transaction details in the transactionlog div

        const transactiondata = Array.from(checkoutitems).map((item, index) => ({
            "Item Name": item.value,
            "Item Quantity": quantities[index].value,
            "Item Price": parseFloat(prices[index].textContent.replace('$', ''))
        }));
        const transactionLog = document.getElementById('transaction-log');
        transactionLog.innerHTML = ''; // Clear previous log

        transactiondata.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'transaction-entry';
    
            const itemName = document.createElement('span');
            itemName.className = 'item-name';
            itemName.textContent = `Item: ${entry["Item Name"]}`;

            const itemPrice = document.createElement('span');
            itemPrice.className = 'item-price';
            itemPrice.textContent = `$${entry["Item Price"]}`;
    
            const itemQuantity = document.createElement('span');
            itemQuantity.className = 'item-quantity';
            itemQuantity.textContent = `Quantity: ${entry["Item Quantity"]}`;;
    
            logEntry.appendChild(itemName);
            logEntry.appendChild(itemPrice);
            logEntry.appendChild(itemQuantity);
    
            transactionLog.appendChild(logEntry);
        });
    
        // Add the grand total at the bottom
        const totalLogEntry = document.createElement('div');
        totalLogEntry.className = 'transaction-entry total';
        totalLogEntry.textContent = `Total Price: $${totalprice.toFixed(2)}`;
        transactionLog.appendChild(totalLogEntry);

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
        })
        .catch(error => {
            console.error('Error processing check-out:', error);
        });


    } else {
        console.log("Transaction was cancelled by the user.");
    }
}}    



// To perform AJAX request upon NRIC query button press
function nricQuery() {
    $.post({
        url:'/status-text',
        data: $('#nric-form').serialize(),
        success: function(data) {
            if (data.message) {
                document.getElementById('status-text').innerText=data.message
            }
            document.getElementsByClassName('status-bar')[0].style.backgroundColor = data.color;

            if (data.message.includes('new')) {
                if(confirm(data.message)){
                    window.location.reload();
                };
            } else document.getElementById("checkout-button").disabled = false   // disables checkout button if nric invalid/none
        }
    });
}

function validateQuantity(inputElement) {
    let value = parseInt(inputElement.value, 10);
    if (isNaN(value) || value < 0) {
        inputElement.value = ''
        inputElement.value = 0;
    } else if (value > 2) {
        inputElement.value = ''
        inputElement.value = 2;
    }
}

function addItemRow() {
    const container = document.getElementById('items-container');
    const row = document.createElement('div');
    row.className = 'item-row';

    row.innerHTML = `
        <select class="checkoutitem form-control col">
            <option disabled selected value="">Item</option>
            ${items.map(item => `<option>${item}</option>`).join('')}
        </select>
        <input class="quantity form-control col" autocomplete="off" autofocus name="quantity" placeholder="Quantity" type="number" min="0" max="2" step="1">
        <div class="price col">$0.00</div>
        <button type="button" class="btn btn-secondary col-auto" onclick="addItemRow()">Add Additional Item</button>
        <button type="button" class="btn btn-danger col-auto remove-item" onclick="this.parentElement.remove()">Remove</button>
    `;

    container.appendChild(row);

    const newSelect = row.querySelector('.checkoutitem');
    const newInput = row.querySelector('.quantity');
    const removeButton = row.querySelector('.remove-item');

    newInput.addEventListener('input', function() { validateQuantity(newInput); });
    newInput.addEventListener('change', function() { validateQuantity(newInput); });
    newSelect.addEventListener('change', updatePrice);
    newInput.addEventListener('input', updatePrice);
    newInput.addEventListener('change', updatePrice);
    removeButton.addEventListener('click', totalPrice);
}

document.addEventListener('DOMContentLoaded', async function () {
    const itemsContainer = document.getElementById('items-container');

    // Attach event listeners to the initial row
    const initialRow = itemsContainer.querySelector('.item-row');
    if (initialRow) {
        const initialSelect = initialRow.querySelector('.checkoutitem');
        const initialInput = initialRow.querySelector('.quantity');

    initialInput.addEventListener('input', function() { validateQuantity(initialInput); });
    initialInput.addEventListener('change', function() { validateQuantity(initialInput); });
    initialSelect.addEventListener('change', updatePrice);
    initialInput.addEventListener('input', updatePrice);
    initialInput.addEventListener('change', updatePrice);
    }

    itemsContainer.addEventListener('input', function(event) {
        if (event.target.classList.contains('quantity')) {
            validateQuantity(event.target)
            updatePrice;
        }
    });

    itemsContainer.addEventListener('change', function(event) {
        if (event.target.classList.contains('quantity')) {
            validateQuantity(event.target);
        }
    });

    await fetchPrice()
});

async function fetchPrice() {
    try {
        const response = await fetch('/get-price');
        const data = await response.json();
        itemPrices = data;
        console.log('Item prices fetched:', itemPrices); // Debugging log
    } catch (error) {
        console.error('Error fetching item prices:', error);
    }
}

function updatePrice() {
    const itemRow = this.closest('.item-row');
    const selectedItem = itemRow.querySelector('.checkoutitem').value;
    const quantity = parseInt(itemRow.querySelector('.quantity').value, 10);
    const priceDiv = itemRow.querySelector('.price');


    if (selectedItem && quantity) {
        const price = itemPrices[selectedItem] * quantity;
        priceDiv.textContent = `$${price.toFixed(2)}`;
        console.log(`Price: $${price.toFixed(2)}`)
    } else {
        priceDiv.textContent = '';
    }

    totalPrice();
}

function totalPrice() {
    const allPrice = document.querySelectorAll('.price');
    const totalCounter = document.querySelector('#total-counter');
    let total = 0;
    allPrice.forEach(div =>{
        const price = parseFloat(div.textContent.replace('$','')) || 0;
        total+=price;
    })
    totalCounter.textContent=`Total: $${total.toFixed(2)}`;
    totalCounter.setAttribute('data-total', total.toFixed(2))
}

