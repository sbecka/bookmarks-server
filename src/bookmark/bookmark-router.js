require('dotenv').config();
const express = require('express');
const bodyParser = express.json();
const logger = require('../logger');
const uuid = require('uuid/v4');
const bookmarkRouter = express.Router();
const BookmarksService = require('../bookmarks-service');

// const bookmarks = [{
//     id: 1,
//     title: "Cheese",
//     url: "https://en.wikipedia.org/wiki/Cheese",
//     description: "History of cheese",
//     rating: 5
// }];

bookmarkRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks)
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;
        
        const newRating = parseInt(rating);

        if (!title) {
            logger.error(`Title is required.`);
            return res.status(400).send('Invalid data');
        }

        if (!url) {
            logger.error(`URL is required.`);
            return res.status(400).send('Invalid data');
        }

        if (!rating) {
            logger.error(`Rating is required.`);
            return res.status(400).send('Invalid data');
        }

        if (newRating < 1 || newRating > 5) {
            logger.error(`Rating needs to be between 1 and 5.`);
            return res.status(400).send(`Rating should be a number between 1 and 5.`);
        }

        const id = uuid();
        const bookmark = {
            id,
            title,
            url,
            description,
            rating
        }

        bookmarks.push(bookmark);

        logger.info(`Bookmark with id ${id} created`);

        res.status(201).location(`http://localhost:8000/bookmark${id}`).json(bookmark)
    })

    bookmarkRouter
        .route('/bookmarks/:bookmark_id')
        .get((req, res, next) => {
            const knexInstance = req.app.get('db');
            BookmarksService.getById(knexInstance, req.params.bookmark_id)
                .then(bookmark => {

                    if (!bookmark) {
                        //logger.error(`Bookmark with id ${id} not found.`)
                        return res.status(404).json({ 
                            error: { message: `Bookmark not found` } 
                        });
                    }
                    res.json(bookmark);
                })
                .catch(next)
        })
        .delete((req, res) => {
            const { id } = req.params;

            const bookmarkIndex = bookmarks.findIndex(mark => mark.id == id);
            if (bookmarkIndex === -1) {
                logger.error(`Bookmark with id ${id} not found.`);
                return res.status(404).send('Bookmark Not Found');
            }

            bookmarks.splice(bookmarkIndex, 1);

            logger.info(`Bookmark with id ${id} deleted.`);

            res.status(204).end();
        })

module.exports = bookmarkRouter;