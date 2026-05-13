#To run frontend
npm install ( package )
npm run dev

#To run backend
- install python
python -m venv venv (create virtual environment)
venv\Scripts\activate ( activate virtual env.[you should see (venv)])
pip install fastapi uvicorn  ( install fast api )


##install dotenv in virtual environment 
pip install python-dotenv

##install motor async
pip install motor

##install email validator
pip install email-validator

##install jose (jwt)
pip install python-jose

##install pass lib
pip install passlib

##install httpx
pip install httpx

## import fitz for pdf
pip install pymupdf

##install cloudinary
pip install cloudinary

## install request
pip install requests

##install multipart
pip install python-multipart



# Git Workflow


## To rabase code from maain branch, pull
git checkout main

git pull

## To create new branch
git checkout -b feature/public-upload

## coding...
git add .

git commit -m "Added upload submission API"

git push -u origin feature/public-upload

## To merge into main 
git checkout main

git pull

git merge feature/public-upload

git push

## To delete branch 
git branch -d feature/public-upload
git push origin --delete feature/public-upload

## To check currunt branch 
git branch --show-current