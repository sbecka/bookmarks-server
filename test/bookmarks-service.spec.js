const BookmarksService = require('../src/bookmarks-service');
const knex = require('knex');
const { makeBookmarksToTest } = require('./bookmarks.fixtures');

describe(`Bookmarks service object`, function() {
    let db;

    before(() => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
    });

    before(() => db('bookmarks').truncate());

    afterEach(() => db('bookmarks').truncate());

    after(() => db.destroy());

    context(`'bookmarks' table has data`, () => {
        const testBookmarks = makeBookmarksToTest();

        beforeEach(() => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        });

        it(`getAllBookmarks resolves all items from 'bookmarks' table`, () => {
            return BookmarksService.getAllBookmarks(db)
                .then(actual => {
                    expect(actual).to.eql(testBookmarks)
                });
        });

        it(`getById() resolves a bookmark by id from 'bookmarks' table`, () => {
            const bookmarkId = 2;
            const bookmarkTest = testBookmarks[bookmarkId - 1];

            return BookmarksService.getById(db, bookmarkId)
                .then(actual => {
                    expect(actual).to.eql({
                        id: bookmarkId,
                        title: bookmarkTest.title,
                        url: bookmarkTest.url,
                        description: bookmarkTest.description,
                        rating: bookmarkTest.rating
                    })
                })
        });

        it(`deleteBookmark() removes a bookmark by id from 'bookmarks' table`, () => {
            const bookmarkId = 3;
            return BookmarksService.deleteBookmark(db, bookmarkId)
                .then(() => BookmarksService.getAllBookmarks(db))
                .then(allBookmarks => {
                    const expected = testBookmarks.filter(book => book.id !== bookmarkId)
                    expect(allBookmarks).to.eql(expected)
                })
        });

        it(`updateBookmark() updates a bookmark from the 'bookmarks' table`, () => {
            const bookmarkId = 3;
            const newBookmarkData = {
                title: 'updated title',
                url: 'updated_url.com',
                description: 'updated description',
                rating: 5
            };

            return BookmarksService.updateBookmark(db, bookmarkId, newBookmarkData)
                .then(() => BookmarksService.getById(db, bookmarkId))
                .then(bookmark => {
                    expect(bookmark).to.eql({
                        id: bookmarkId,
                        ...newBookmarkData
                    })
                });
        });
    });

    context(`Given 'bookmarks' has no data`, () => {
        it(`getAllBookmarks() resolves an empty array`, () => {
            return BookmarksService.getAllBookmarks(db)
                .then(actual => {
                    expect(actual).to.eql([])
                })
        });

        it(`insertBookmark() inserts a new bookmark and resolves the new bookmark with an 'id'`, () => {
            const newBookmark = {
                title: 'New title',
                url: 'newnewnew_url.com',
                description: 'new description',
                rating: 4
            };

            return BookmarksService.insertBookmark(db, newBookmark)
                .then(actual =>  {
                    expect(actual).to.eql({
                        id: 1,
                        title: newBookmark.title,
                        url: newBookmark.url,
                        description: newBookmark.description,
                        rating: newBookmark.rating
                    })
                });
        });
    });
});