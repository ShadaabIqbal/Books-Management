const { isValidObjectId } = require("mongoose")
const bookModel = require("../models/bookModel")
const userModel = require("../models/userModel")
const { isEmpty } = require("../validation/validation")
const reviewModel = require("../models/reviewModel")
const moment = require('moment')


const createBook = async function (req, res) {
    try {
        let data = req.body
        const { title, excerpt, userId, ISBN, category, subcategory, releasedAt, reviews } = data

        // IF BODY IS EMPTY.------------------------------------------
        if (Object.keys(data).length == 0)
            return res.status(400).send({ status: false, message: "Please provide data in request body" })

        // IF VALUES ARE NOT IN BODY.--------------------------------
        if (!title)
            return res.status(400).send({ stauts: false, message: "title is required" })

        if (!excerpt)
            return res.status(400).send({ stauts: false, message: "excerpt is required" })

        if (!userId)
            return res.status(400).send({ stauts: false, message: "userId is required" })

        if (!ISBN)
            return res.status(400).send({ stauts: false, message: "ISBN is required" })

        if (!category)
            return res.status(400).send({ stauts: false, message: "category is required" })

        if (!subcategory)
            return res.status(400).send({ stauts: false, message: "subcategory is required" })

        if (!releasedAt)
            return res.status(400).send({ stauts: false, message: "releasedAt is required" })

        if (!isValidObjectId(userId)) return res.status(400).send({ stauts: false, message: "userId is invalid" })

        // IF VALUES ARE EMPTY BY INFO.-------------------------------------
        if (!(isEmpty(title))) return res.status(400).send({ stauts: false, message: "title is empty" })
        if (!(isEmpty(excerpt))) return res.status(400).send({ stauts: false, message: "excerpt is empty" })
        if (!(isEmpty(ISBN))) return res.status(400).send({ stauts: false, message: "ISBN is empty" })
        if (!(isEmpty(category))) return res.status(400).send({ stauts: false, message: "category is empty" })
        if (!(isEmpty(subcategory))) return res.status(400).send({ stauts: false, message: "subcategory is empty" })
        if (!(isEmpty(releasedAt))) return res.status(400).send({ stauts: false, message: "releasedAt is empty" })

        /*------------------------Checking title is unique or not-----------------------------------*/
        const findbook = await bookModel.findOne({ title: data.title })
        if (findbook) return res.status(400).send({ status: false, message: "Title is registered please pass new title" })

        /*------------------------Checking ISBN is unique or not-----------------------------------*/
        const findISBN = await bookModel.findOne({ ISBN: data.ISBN })
        if (findISBN) return res.status(400).send({ status: false, message: "ISBN is registered please pass new ISBN" })

        /*------------------------Checking author is present in DB or not-----------------------------------*/
        const findAuthor = await userModel.findById({ _id: userId })
        if (!findAuthor) return res.status(404).send({ status: false, message: "author is not present in our DB i.e., you have to register first" })

        /*------------------------Authorization-----------------------------------*/
        if (req.body.userId != req.tokenVerify.userId) { return res.status(403).send({ status: false, message: "you are unauthorized to create book data" }) }

        const createdBook = await bookModel.create(data)
        return res.status(201).send({ status: true, message: "Success", data: createdBook })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

const allBooks = async function (req, res) {
    try {
        const { userId, category, subcategory } = req.query

        //CREATING AN OBJECT AND DESTRUCTURING.------------------------------------------------------
        let findObj = {
            isDeleted: false,
        }

        if (userId) {
            findObj["userId"] = userId
        }
        if (category) {
            findObj["category"] = category
        }
        if (subcategory) {
            findObj["subcategory"] = subcategory
        }

        if (userId) {
            if (!isValidObjectId(userId)) return res.status(400).send({ stauts: false, message: "userId is invalid" })
        }
        
        //SELECTING ONLY THE WANTED DATA.---------------------------------------------------------------------------------
        let data = await bookModel.find(findObj).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
        
        if (data.length == 0) return res.status(404).send({ Status: false, message: 'No Data Found' })
        
        //SORTING THE DATA ACCORDINGLY TO ALPHABETICAL ORDER OF TITLE.----------------------------------------------------
        data.sort((a, b) => a.title > b.title ? 1 : -1)

        res.status(200).send({ status: true, message: "success", data: data })

    } catch (err) {
        console.log(err)
        res.status(500).send({ status: false, message: err.message })
    }
}

const getBooksById = async function (req, res) {
    try {
        let bookId = req.params.bookId;

        //CHECKING IF USER ID VALID OR NOT.---------------------------------------------------------------------
        if (!isValidObjectId(bookId)) return res.status(400).send({ stauts: false, message: "bookId is invalid" })

        let isBookPresent = await bookModel.findOne({ _id: bookId })

        if (!isBookPresent)
            return res.status(404).send({ Status: false, message: "No Data found" })

        if (isBookPresent.isDeleted == true)
            return res.status(404).send({ Status: false, msg: "Book is already deleted." })

        //DESTRUCTURING HERE.------------------------------------------------------------------------------------
        let { _id, title, excerpt, userId, ISBN, category, subcategory, isDeleted, releasedAt, createdAt, updatedAt } = isBookPresent;

        let totalReviews = await reviewModel.find({ bookId: bookId, isDeleted: false }).select({ _id: 1, bookId: 1, reviewedBy: 1, reviewedAt: 1, rating: 1, review: 1 })

        //ADDING TOTALREVIEWS IN REVIEWSDATA HERE.---------------------------------------------------------------
        let obj = { _id, title, excerpt, userId, ISBN, category, subcategory, isDeleted, reviews: totalReviews.length, releasedAt, createdAt, updatedAt, reviewsData: totalReviews }

        res.status(200).send({ status: true, message: "success", data: obj })
    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

const updatebook = async function (req, res) {
    try {
        const id = req.params.bookId;
        if (!isValidObjectId(id)) return res.status(400).send({ stauts: false, message: "userId is invalid" })
        
        //CHECKING IF BODY IS EMPTY OR CONTAINING MORE THAN 4 ATTRIBUTES.-----------------------------
        const data = req.body;
        if (Object.keys(data).length == 0 || Object.keys(data).length > 4)
            return res.status(400).send({ status: false, message: "Please pass proper data to update. " })

        const findinDB = await bookModel.findById(id);

        if (!findinDB)
            return res.status(404).send({ status: false, message: "No user id found." })

        //CHECKING IF DELETED OR NOT------------------------------------------------------------------
        if (findinDB.isDeleted == true)
            return res.status(400).send({ status: false, message: "This book has been deleted" })
 
        //CHECKING TITLE IS ALREADY REGISTERED OR NOT--------------------------------------------------
        const duplicateTitle = await bookModel.findOne({ title: data.title })
        if (duplicateTitle)
            return res.status(400).send({ status: false, message: "Title is registered already so please put another title" })

         //CHECKING ISBN IS ALREADY REGISTERED OR NOT--------------------------------------------------
        const duplicateISBN = await bookModel.findOne({ ISBN: data.ISBN })
        if (duplicateISBN)
            return res.status(400).send({ status: false, message: "ISBN is registered already so please put another ISBN" })

        //UPDATING BOOKS HERE -------------------------------------------------------------------------
        const updatedBooks = await bookModel.findOneAndUpdate({ _id: id },
            {
                $set: {
                    title: data.title,
                    excerpt: data.excerpt,
                    releasedAt: data.releasedAt,
                    ISBN: data.ISBN
                }
            },
            { new: true })


        return res.status(200).send({ status: true, message: "Success", data: updatedBooks })

    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

const deleteBook = async function (req, res) {
    try {

        const bookId = req.params.bookId
  
        //CHECKING FOR BOOKID IS GIVEN BY USER AND A VALID ID TOO.----------------------------------------
        if (!bookId)
            return res.status(400).send({ status: true, message: "bookId is required" })

        if (!isValidObjectId(bookId))
            return res.status(400).send({ status: false, message: "Invalid bookId" })

        //FINDING IN DB THAT BOOK BY ID.------------------------------------------------------------------
        const bookDetails = await bookModel.findById(bookId)
        if (!bookDetails)
            return res.status(404).send({ status: false, message: "book with this id is not present in our DB" })

        if (bookDetails.isDeleted == true)
            return res.status(404).send({ status: false, message: "book is already deleted" })

        //USING HERE MOMENT FOR DATE FORMAT.-------------------------------------------------------------
        let today = moment().format("YYYY-MM-DD", "hh-mm-ss a")

        //UPDATING IS DELETED WITH UPDATED DATE.---------------------------------------------------------
        const flagDelete = await bookModel.findOneAndUpdate({ _id: bookId },
             { $set:  { 
                   isDeleted: true, 
                   deletedAt: today 
                } 
            }, 
            { new: true })

        return res.status(200).send({ status: true, message: "Success", data: flagDelete })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}

module.exports = { allBooks, createBook, getBooksById, updatebook, deleteBook };



