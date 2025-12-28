import { db } from './firebase.js';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initLanguageToggle } from './language-utils.js';

initLanguageToggle();

const articlesContainer = document.getElementById('articles-container');
const searchForm = document.querySelector('.search-form');
const searchInput = document.getElementById('article-search');
const loadMoreBtn = document.getElementById('load-more');

// Ek hi function jo sab sambhaalega
async function loadArticles(searchTerm = "", isAll = false) {
    if (!articlesContainer) return;

    // Prevent main.js from loading articles on the dedicated articles page (handled by articles.js)
    if (document.body.classList.contains('articles-page')) return;

    // Loading State
    articlesContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Fetching articles...</p>
        </div>
    `;

    try {
        let q;
        const articlesRef = collection(db, "articles");

        if (searchTerm) {
            // Search logic
            q = query(
                articlesRef,
                where("title", ">=", searchTerm),
                where("title", "<=", searchTerm + '\uf8ff')
            );
        } else if (isAll) {
            // Browse All (No limit)
            q = query(
                articlesRef,
                orderBy("createdAt", "desc")
            );
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            // Default (Limit 12)
            q = query(
                articlesRef,
                orderBy("createdAt", "desc"),
                limit(12)
            );
        }

        const querySnapshot = await getDocs(q);
        articlesContainer.innerHTML = "";

        if (querySnapshot.empty) {
            articlesContainer.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; padding: 20px;">
                    No articles found.
                </p>
            `;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const articleId = doc.id;

            // Yahan 'data.image' use kiya hai kyunki aapke DB mein yahi naam hai
            const card = `
                <article class="article-card">
                    <div class="article-image">
                        <img 
                            src="${data.image || data.coverImage || 'images/java-script.avif'}"
                            alt="${data.title}"
                            onerror="this.src='images/java-script.avif'"
                        >
                    </div>
                    <div class="article-content">
                        <span class="category-badge">
                            ${data.category || 'Tech'}
                        </span>
                        <h3>${data.title}</h3>
                        <p>
                            ${
                                data.content
                                    ? data.content.substring(0, 90) + '...'
                                    : 'No description available.'
                            }
                        </p>
                        <a href="reader.html?id=${articleId}" class="btn-link">
                            Read Full Guide
                        </a>
                    </div>
                </article>
            `;

            articlesContainer.insertAdjacentHTML('beforeend', card);
        });

    } catch (error) {
        console.error("Error:", error);
        articlesContainer.innerHTML = `
            <p style="color: red; text-align: center; grid-column: 1/-1;">
                Error loading articles. Check console for details.
            </p>
        `;
    }
}

// Event Listeners
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadArticles(searchInput.value.trim());
    });
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
        loadArticles("", true); // Yeh 'true' flag saare articles load karega
    });
}

// Initial Load
loadArticles();

// Newsletter Logic (Same as before)
document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');

        if (emailInput?.value) {
            const btn = form.querySelector('button');
            btn.disabled = true;

            try {
                await addDoc(
                    collection(db, "subscribers"),
                    {
                        email: emailInput.value,
                        createdAt: serverTimestamp()
                    }
                );
                alert("Subscribed!");
                form.reset();
            } catch (err) {
                console.error(err);
            } finally {
                btn.disabled = false;
            }
        }
    });
});
