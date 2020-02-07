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
}

module.exports = {
    makeBookmarksToTest
};