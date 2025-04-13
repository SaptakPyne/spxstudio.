// Payment handling with Stripe and bank transfers

// Initialize payment elements when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Global variable to store current template ID
    let currentTemplateId = null;
    
    // Get template-specific elements
    const viewDetailsButtons = document.querySelectorAll('.view-details');
    const buyNowBtn = document.getElementById('buy-now-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    
    // Payment modal elements
    const paymentModal = document.getElementById('payment-modal');
    const paymentClose = document.getElementById('payment-close');
    const completePaymentBtn = document.getElementById('complete-payment');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentItemName = document.getElementById('payment-item-name');
    const paymentItemPrice = document.getElementById('payment-item-price');
    
    // Bank transfer elements
    const bankTab = document.querySelector('.payment-tab[data-tab="bank"]');
    const bankPaymentSection = document.getElementById('bank-payment');
    
    // Set up event listeners for template details buttons
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Store the template ID for later use in payment
            currentTemplateId = button.getAttribute('data-template');
        });
    });
    
    // Add event listener for bank transfer tab
    if (bankTab) {
        bankTab.addEventListener('click', async () => {
            if (!currentTemplateId) {
                console.error('No template selected for bank transfer');
                return;
            }
            
            try {
                // Make API call to get bank transfer info
                const response = await fetch('/api/bank-transfer-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        templateId: currentTemplateId
                    }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to get bank transfer information');
                }
                
                const data = await response.json();
                
                // Update the bank transfer information in the DOM
                // Note: This is already set in the HTML, but in a real app, you'd update this dynamically
                console.log('Bank transfer info loaded:', data.payment_info);
                
                // If you want to update the reference number dynamically, uncomment this:
                // const referenceInput = bankPaymentSection.querySelector('input[value="TEMPLATE-12345"]');
                // if (referenceInput) {
                //     referenceInput.value = data.payment_info.reference;
                // }
            } catch (error) {
                console.error('Error loading bank transfer details:', error);
            }
        });
    }
    
    // Set up event listener for Buy Now button
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
            if (!currentTemplateId) {
                alert('Error: Template not found');
                return;
            }
            
            try {
                // Show a loading indicator
                buyNowBtn.textContent = 'Loading...';
                buyNowBtn.disabled = true;
                
                // Make API call to create payment intent
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        templateId: currentTemplateId
                    }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create payment intent');
                }
                
                const data = await response.json();
                
                // Update payment modal with product information
                paymentItemName.textContent = data.product.name;
                const price = `$${data.product.price.toFixed(2)}`;
                paymentAmount.textContent = price;
                paymentItemPrice.textContent = price;
                
                // Initialize Stripe payment elements
                initStripePayment(data.clientSecret);
                
                // Hide template modal and show payment modal
                document.getElementById('template-modal').style.display = 'none';
                paymentModal.style.display = 'block';
                
            } catch (error) {
                console.error('Payment error:', error);
                alert('An error occurred while processing your payment. Please try again.');
            } finally {
                // Reset button
                buyNowBtn.textContent = 'Buy Now';
                buyNowBtn.disabled = false;
            }
        });
    }
    
    // Close payment modal
    if (paymentClose) {
        paymentClose.addEventListener('click', () => {
            paymentModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    // Handle payment method tabs
    const paymentTabs = document.querySelectorAll('.payment-tab');
    const paymentMethodContents = document.querySelectorAll('.payment-method-content');
    
    paymentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            paymentTabs.forEach(t => t.classList.remove('active'));
            paymentMethodContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-payment`).classList.add('active');
        });
    });
    
    // Until Stripe is fully set up, simulate payment processing
    if (completePaymentBtn) {
        completePaymentBtn.addEventListener('click', () => {
            // Basic form validation
            const cardName = document.getElementById('card-name').value;
            const cardNumber = document.getElementById('card-number').value;
            const cardExpiry = document.getElementById('card-expiry').value;
            const cardCvc = document.getElementById('card-cvc').value;
            const termsChecked = document.getElementById('terms').checked;
            
            if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
                alert('Please fill in all card details');
                return;
            }
            
            if (!termsChecked) {
                alert('Please agree to the terms and conditions');
                return;
            }
            
            // Simulate payment processing - in a production app, this would call Stripe
            completePaymentBtn.textContent = 'Processing...';
            completePaymentBtn.disabled = true;
            
            setTimeout(() => {
                // Simulate successful payment
                // alert('Payment successful! You will receive an email with download instructions.');
                paymentModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                
                // Reset button
                completePaymentBtn.textContent = 'Complete Payment';
                completePaymentBtn.disabled = false;
                
                // Redirect to success page with parameters
                const productName = paymentItemName.textContent;
                const amount = paymentItemPrice.textContent;
                const orderId = 'ORD-' + Math.floor(Math.random() * 90000 + 10000);
                window.location.href = `/payment-success.html?orderId=${orderId}&product=${encodeURIComponent(productName)}&amount=${encodeURIComponent(amount)}&method=Credit Card`;
            }, 2000);
        });
    }
    
    // Function to initialize Stripe payment elements
    function initStripePayment(clientSecret) {
        // Check if Stripe is loaded
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js not loaded');
            return;
        }
        
        // Get UI elements
        const paymentForm = document.getElementById('payment-form');
        const paymentElement = document.getElementById('payment-element');
        const cardDetailsForm = document.querySelector('.card-details');
        const cardNameInput = document.getElementById('card-name');
        const billingAddressInput = document.getElementById('billing-address');
        const completePaymentBtn = document.getElementById('complete-payment');
        const paymentMessage = document.getElementById('payment-message');
        
        // In a production environment with a real Stripe key:
        // 1. Hide the regular form fields
        // 2. Show the Stripe Elements container
        // 3. Create and mount Stripe Elements
        // 4. Handle the payment submission

        // For now, we'll use the simulated payment flow
        // When you get your Stripe API key, uncomment the following code:
        
        /*
        // Initialize Stripe with your publishable key
        const stripe = Stripe('pk_test_your_stripe_public_key');
        
        // Create elements instance with the client secret
        const elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#3a86ff',
                }
            }
        });
        
        // Hide regular form fields and show Stripe Elements
        cardDetailsForm.style.display = 'none';
        paymentElement.style.display = 'block';
        
        // Create and mount the Payment Element
        const stripePaymentElement = elements.create('payment');
        stripePaymentElement.mount('#payment-element');
        
        // Handle form submission
        paymentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Disable the submit button to prevent multiple clicks
            completePaymentBtn.disabled = true;
            completePaymentBtn.textContent = 'Processing...';
            
            // Collect user information
            const billingDetails = {
                name: cardNameInput.value,
                address: {
                    line1: billingAddressInput.value
                }
            };
            
            // Confirm the payment
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/payment-success.html',
                    payment_method_data: {
                        billing_details: billingDetails
                    }
                }
            });
            
            if (error) {
                // Show error message
                paymentMessage.textContent = error.message;
                paymentMessage.style.display = 'block';
                
                // Re-enable the button
                completePaymentBtn.disabled = false;
                completePaymentBtn.textContent = 'Complete Payment';
            }
            // If successful, the page will redirect to the return_url
        });
        */
    }
});