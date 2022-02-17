function getValue(inputAmount){
    const givenInputs = document.getElementById(inputAmount);
    const givenAmounts = givenInputs.value;
     return givenAmounts;
}

// Calculation
function calculation(clickInput){
    const incomeInput = getValue('inputIncome');
    const expFood = getValue('foodExpense');
    const expRent = getValue('rentExpense');
    const expCloth = getValue('clothExpense');
    const savePerecentage = getValue('saveInput');

    if(incomeInput>0 && expFood>0 && expRent>0 && expCloth>0){
        const totalExpense = parseFloat(expFood) + parseFloat(expRent) + parseFloat(expCloth);
        const remainingBalance = parseFloat(incomeInput) - totalExpense;
        const pSaving = (parseFloat(savePerecentage)/100)*parseFloat(incomeInput);
        const finalBalance = remainingBalance - pSaving;
        
        if( clickInput == true){    //onClick for Calculate button
            if(parseFloat(incomeInput)>totalExpense){
                totalExpenseDisplay.innerText = totalExpense;
                balanceDisplay.innerText = remainingBalance;
            }
            else{ // error message if expense>income
                const p = document.createElement('p');
                p.classList.add('text-center', 'text-red-600');
                p.innerText = 'Your expense is more than your income.';
                const div1 = document.getElementById('div-2');
                div1.appendChild(p);
                balanceDisplay.innerText = incomeInput;
            }
        }
        else{      //onClick for save button
            if(savePerecentage>0){
                if(pSaving<remainingBalance){
                    savingAmountDisplay.innerText = pSaving;
                    remainingBalanceDisplay.innerText = finalBalance;                    
                }
                else{  // error message if saving>remaining
                    const p = document.createElement('p');
                    p.classList.add('text-center', 'text-red-600');
                    p.innerText = 'Your saving amount is more than your remaining balance.';
                    const div1 = document.getElementById('div-1');
                    div1.appendChild(p);
                 }
            }
            else{  // error message if saving input is not a positive number
                const p = document.createElement('p');
                p.classList.add('text-center', 'text-red-600');
                p.innerText = 'Please enter positive values for all above fields.';
                const div1 = document.getElementById('div-3');
                div1.appendChild(p);
             }
        }
    }
    else{    // error message if income-expense inputs are not positive number
        const p = document.createElement('p');
        p.classList.add('text-center', 'text-red-600');
        p.innerText = 'Please enter positive values for all above fields.';
        const div1 = document.getElementById('div-1');
        div1.appendChild(p);
     }

    
}


// incomeExpense 

document.getElementById('calculate-btn').addEventListener('click', function(){
    const calculate = true;
    calculation(calculate);
});

// saving 

document.getElementById('save-btn').addEventListener('click', function(){
    const save = false;
    calculation(save);
});