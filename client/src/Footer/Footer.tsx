import './Footer.css';

function Footer() {
    const source_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator';
    const bugs_uri = 'https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator/issues';
    return (
        <footer>
            <ul>
                <li>Copyright 2021</li>
                <li><a href={source_uri}>Source</a></li>
                <li><a href={bugs_uri}>Report Bugs</a></li>
            </ul>
        </footer>
    )
}

export default Footer;