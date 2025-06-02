from flask import Flask, render_template, request
from web3 import Web3
import os
import json

app = Flask(__name__)
flag = os.environ.get("FLAG")

w3 = Web3(Web3.HTTPProvider("http://anvil:8545"))  # sova-rpc.task.sasc.tf
with open("abi.json") as f:
    abi = json.load(f)    
with open("contract-address.txt") as f:
    contract_address = f.read().strip()

contract = w3.eth.contract(address=contract_address, abi=abi)

@app.route("/", methods=["GET", "POST"])
def index():
    message = ""
    if request.method == "POST":
        user_input = request.form["input"]
        try:
            contract.functions.validate(user_input).call()
            message = f"The flag is: {flag}"
        except Exception as e:
            message = f"Contract: {contract_address}, Error: {str(e)}"
    return render_template("index.html", message=message)
