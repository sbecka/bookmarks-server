function makeBookmarksToTest() {
    return [
        {
            id: 1,
            title: 'Test1',
            url: 'https://www.testwebsite.com/',
            description: 'Search for any recipes', 
            rating: 3
        },
        {
            id: 2,
            title: 'Test2',
            url: 'https://www.2testwebsite.com/',
            description: '2 Search for any recipes', 
            rating: 4
        },
        {
            id: 3,
            title: 'Test3!',
            url: 'https://www.3estwebsite.com/',
            description: '3 carrots restaurant', 
            rating: 1
        }
        
    ]
};

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        title: 'B <script>alert("x");</script>',
        url: 'https://www.badbadbad.org',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 2
    }

    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'B &lt;script&gt;alert(\"x\");&lt;/script&gt;',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }

    return {
        maliciousBookmark,
        expectedBookmark
    }
}

module.exports = {
    makeBookmarksToTest,
    makeMaliciousBookmark
};