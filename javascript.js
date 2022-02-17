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

    const totalExpense = parseFloat(expFood) + parseFloat(expRent) + parseFloat(expCloth);
    const remainingBalance = incomeInput - totalExpense;
    const pSaving = (parseFloat(savePerecentage)/100)*incomeInput;
    const finalBalance = remainingBalance - pSaving;


    if( clickInput == true){    //onClick for Calculate button
        totalExpenseDisplay.innerText = totalExpense;
        balanceDisplay.innerText = remainingBalance;
    }
    else{      //onClick for save button
        savingAmountDisplay.innerText = pSaving;
        remainingBalanceDisplay.innerText = finalBalance;
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