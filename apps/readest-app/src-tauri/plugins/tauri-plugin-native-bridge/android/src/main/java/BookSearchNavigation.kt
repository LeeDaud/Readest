package com.readest.native_bridge

import java.net.URI

/** Restores an initial book search only when a mirror drops it on its homepage. */
internal class BookSearchNavigation(initialUrl: String?) {
    private val searchPath = parse(initialUrl)?.rawPath?.takeIf { it.startsWith("/s/") && it.length > 3 }
    private val restoredOrigins = mutableSetOf<String>()
    var pending = searchPath != null
        private set

    fun onPageReady(url: String?, hasSearchForm: Boolean): String? {
        if (!pending) return null
        val page = parse(url) ?: return null
        val path = page.rawPath.orEmpty()
        if (path.startsWith("/s/") && path.length > 3) {
            pending = false
            return null
        }
        if (!hasSearchForm || (path.isNotEmpty() && path != "/") || !page.rawQuery.isNullOrEmpty()) return null
        val origin = "${page.scheme}://${page.rawAuthority}"
        if (restoredOrigins.size >= 10 || !restoredOrigins.add(origin)) {
            pending = false
            return null
        }
        return origin + searchPath
    }

    private fun parse(url: String?): URI? = try {
        url?.let { URI(it) }?.takeIf {
            (it.scheme == "https" || it.scheme == "http") && it.host != null && it.rawUserInfo == null
        }
    } catch (_: Exception) {
        null
    }
}
