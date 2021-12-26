import React from 'react';
import './About.css';

function About() {
    const download_uri = '/addon-download';
    const full_about_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator/blob/main/README.md';
    return (
        <div id="About">
            <span className='header'>About</span>
            <p>Crafting Profits Calculator is designed to help figure out
                if it is worth your time and gold to craft an item or buy it on the auction house.</p>

            <span className='header'>Known Issues</span>
            <ul>
                <li>The behaviour of some international servers is undefined.</li>
                <li>China is no fully supported.</li>
                <li>Internationalization is not supported and all text is in en_us.</li>
                <li>All searches are done in en_us.</li>
            </ul>

            <span className='header'>Links</span>
            <a href={full_about_uri}>Full Readme [github]</a>
            <a href={download_uri}>Download Addon</a>
        </div>
    )
}

export default About;