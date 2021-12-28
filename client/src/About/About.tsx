import React from 'react';
import './About.css';

function About() {
    const download_uri = '/addon-download';
    const full_about_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator/blob/main/README.md';
    const source_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator';
    const bugs_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator/issues';
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
                <li>Some items are incorrectly listed as being available from vendors,
                    this can confuse the system. If you find one of these please <a href={bugs_uri}>report it</a>.</li>
            </ul>

            <span className='header'>Privacy</span>
            <p>wowcpc.info does not collect any personal information and requires no login.
                Basic server logs of errors may be kept, but ip addresses or other user identifiable information is not.
                You can check our work by looking at <a href={source_uri}>the source</a>, which is exactly what we deply.
            </p>

            <span className='header'>Links</span>
            <a href={full_about_uri}>Full Readme [github]</a>
            <a href={download_uri}>Download Addon</a>
        </div>
    )
}

export default About;