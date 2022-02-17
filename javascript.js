function getValue(value){
    const givenInputs = document.getElementById(value);
    const givenAmounts = givenInputs.value;
     return givenAmounts;
}

document.getElementById('calculate-btn').addEventListener('click', function(){
    const incomeInput = getValue(inputIncome);
    const expFood = getValue(foodExpense);
    const expRent = getValue(rentExpense);
    const expCloth = getValue(clothExpense);

    const totalExpense = expFood + expRent + expCloth;
    totalExpenseDisplay.innerText = totalExpense;
    const remainingBalance = incomeInput - totalExpense;
    balanceDisplay.innerText = remainingBalance
});