/**
 * Kitaab Faroosh – Footer Injection Script
 *
 * Purpose
 * - Provides a single, reusable footer across static pages by injecting a fully self-contained HTML template
 */
(function () {

    const footerHTML = `
    <footer style="background-color: var(--white); color: var(--text-main); padding: 60px 0; border-top: 1px solid var(--border-light); margin-top: 80px;">
        <div class="container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
            
            <div style="grid-column: span 2;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <img src="/assets/logo.png" alt="Logo" style="height: 48px; width: auto; object-fit: contain;">
                    <span style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">Kitaab Faroosh</span>
                </div>
                <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px; max-width: 320px;">
                    Pakistan's most trusted campus marketplace. Buy and sell books, notes, and study gear safely within your institution.
                </p>
                <div style="display: flex; gap: 16px; margin-top: 24px;">
                    <a href="https://www.facebook.com/share/18ZeXrLZiQ/" target="_blank" style="color: var(--primary); font-size: 20px;"><i class="fab fa-facebook"></i></a>
                    <a href="https://whatsapp.com/channel/0029Vb7hBBkHQbRwI1BDXr1e" target="_blank" style="color: var(--primary); font-size: 20px;"><i class="fab fa-whatsapp"></i></a>
                    <a href="https://twitter.com/kitaabfaroosh" target="_blank" style="color: var(--primary); font-size: 20px;"><i class="fab fa-twitter"></i></a>
                </div>
            </div>

            <div>
                <h4 style="font-weight: 800; margin-bottom: 24px; color: var(--primary); text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Categories</h4>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px;"><a href="/college.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">College Materials</a></li>
                    <li style="margin-bottom: 12px;"><a href="/school.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">School Materials</a></li>
                    <li style="margin-bottom: 12px;"><a href="/university.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">University Materials</a></li>
                </ul>
            </div>

            <div>
                <h4 style="font-weight: 800; margin-bottom: 24px; color: var(--primary); text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Support</h4>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px;"><a href="/contact-us.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">Contact Us</a></li>
                    <li style="margin-bottom: 12px;"><a href="/faq.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">FAQ</a></li>
                    <li style="margin-bottom: 12px;"><a href="/terms-of-use.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">Terms of Use</a></li>
                    <li style="margin-bottom: 12px;"><a href="/privacy-policy.html" style="color: var(--text-muted); text-decoration: none; font-size: 14px;">Privacy Policy</a></li>
                </ul>
            </div>
            
        </div>
        <div class="container" style="text-align: center; margin-top: 60px; padding-top: 30px; border-top: 1px solid var(--border-light); color: var(--text-light); font-size: 13px;">
            <p>© 2026 Kitaab Faroosh | A Marketplace for Pakistani Students</p>
        </div>
    </footer>
    `;


    function injectFooter() {
        const placeholder = document.getElementById('main-footer-placeholder');
        if (placeholder) {

            placeholder.innerHTML = footerHTML;
        }
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFooter);
    } else {
        injectFooter();
    }
})();
