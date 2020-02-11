require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = express.json();
const logger = require('../logger');
// const uuid = require('uuid/v4');
const xss = require('xss');
const bookmarkRouter = express.Router();
const BookmarksService = require('../bookmarks-service');

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: Number(bookmark.rating)
});

bookmarkRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res, next) => {

        for (const field of ['title', 'url', 'rating']) {
            if (!req.body[field]) {
                logger.error(`${field} is required`)
                return res.status(400).send({
                    error: { message: `'${field}' is required` }
                })
            }
        }
        
        const { title, url, description, rating } = req.body;
        const newRating = parseInt(rating);

        if (newRating < 1 || newRating > 5) {
            logger.error(`Rating needs to be between 1 and 5.`);
            return res.status(400).send(`Rating should be a number between 1 and 5.`);
        }

        // const id = uuid();
        const newBookmark = {
            title,
            url,
            description,
            rating
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
               logger.info(`Bookmark with id ${bookmark.id} created`);
               res
                 .status(201)
                 .location(path.posix.join(req.originalUrl, `${bookmark.id}`))
                 .json(serializeBookmark(bookmark)) 
            })
            .catch(next)
    })

    bookmarkRouter
        .route('/:bookmark_id')
        .all((req, res, next) => {
            const knexInstance = req.app.get('db');
            BookmarksService.getById(knexInstance, req.params.bookmark_id)
                .then(bookmark => {
                    if (!bookmark) {
                        logger.error(`Bookmark with id ${req.params.bookmark_id} not found.`)
                        return res.status(404).json({ 
                            error: { message: `Bookmark Not Found` } 
                        });
                    }
                    res.bookmark = bookmark
                    next()
                })
                .catch(next)
        })
        .get((req, res) => {
            res.json(serializeBookmark(res.bookmark))      
        })
        .delete((req, res, next) => {
            BookmarksService.deleteBookmark(
                req.app.get('db'),
                req.params.bookmark_id
            )
            .then(() => {
                res.status(204).end()
            })
            .catch(next)
        })

module.exports = bookmarkRouter;