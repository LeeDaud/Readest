package com.readest.native_bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BookSearchNavigationTest {
    private val search = "/s/%E4%B8%89%E4%BD%93%20%E5%88%98%E6%85%88%E6%AC%A3%20%2F%20%26"

    @Test
    fun redirectToNewHomepage_restoresEntireEncodedSearch() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        assertEquals("https://books.example$search", navigation.onPageReady("https://books.example/", true))
    }

    @Test
    fun challengeAndLogin_waitForSearchableHomepage() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        assertNull(navigation.onPageReady("https://books.example/", false))
        assertNull(navigation.onPageReady("https://accounts.example/login", false))
        assertEquals("https://books.example$search", navigation.onPageReady("https://books.example/", true))
    }

    @Test
    fun completedSearch_doesNotOverrideUserBrowsingOrSearchEdits() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        assertNull(navigation.onPageReady("https://books.example$search", true))
        assertNull(navigation.onPageReady("https://books.example/", true))
        assertNull(navigation.onPageReady("https://books.example/s/another", true))
    }

    @Test
    fun repeatedHomepage_doesNotLoop() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        assertEquals("https://books.example$search", navigation.onPageReady("https://books.example/", true))
        assertNull(navigation.onPageReady("https://books.example/", true))
        assertNull(navigation.onPageReady("https://other.example/", true))
    }

    @Test
    fun redirectChain_restoresOnEachNewHost() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        assertEquals("https://first.example$search", navigation.onPageReady("https://first.example/", true))
        assertEquals("https://second.example$search", navigation.onPageReady("https://second.example/", true))
    }

    @Test
    fun ordinaryEntry_neverTriggersSearch() {
        for (entry in listOf(null, "https://books.example/", "https://books.example/s/", "bad URL")) {
            assertNull(BookSearchNavigation(entry).onPageReady("https://books.example/", true))
        }
    }

    @Test
    fun otherPagesAndUnsafeSchemes_areUntouched() {
        val navigation = BookSearchNavigation("https://alias.example$search")
        for (url in listOf(null, "not a URL", "https://books.example/book/123", "https://books.example/?login=1", "file:///", "javascript:alert(1)", "https://user:password@books.example/")) {
            assertNull(navigation.onPageReady(url, true))
        }
    }

    @Test
    fun loopbackFixture_preservesHostAndPort() {
        val navigation = BookSearchNavigation("http://127.0.0.1:8099$search")
        assertEquals("http://localhost:8099$search", navigation.onPageReady("http://localhost:8099/", true))
    }
}
