<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:exsl="http://exslt.org/common"
                xmlns:x="http://www.tei-c.org/ns/1.0"
                xmlns:tst="https://github.com/tst-project"
                exclude-result-prefixes="x tst">

<xsl:import href="../lib/xslt/copy.xsl"/>
<xsl:import href="../lib/xslt/functions.xsl"/>
<xsl:import href="../lib/xslt/definitions.xsl"/>
<xsl:import href="../lib/xslt/common.xsl"/>
<xsl:import href="../lib/xslt/teiheader.xsl"/>
<xsl:import href="../lib/xslt/transcription.xsl"/>
<xsl:import href="../lib/xslt/apparatus.xsl"/>
<!--xsl:import href="../lib/xslt/tei-to-html.xsl"/-->

<!-- these imports are compiled by Javascript, since WebKit's XSLTProcessor() doesn't play well with it -->

<xsl:output method="html" encoding="UTF-8" omit-xml-declaration="yes"/>
<xsl:template match="x:TEI">
    <xsl:element name="div">
        <xsl:attribute name="id">recordcontainer</xsl:attribute>
        <xsl:attribute name="lang">en</xsl:attribute>
        <xsl:element name="div">
            <xsl:choose>
                <xsl:when test="x:facsimile/x:graphic/@url">
                    <xsl:attribute name="class">record thin</xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:attribute name="class">record fat</xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <!--xsl:attribute name="class">record-fat</xsl:attribute-->
            <div id="topbar">
                <div id="buttoncontainer">
                    <xsl:element name="div">
                        <xsl:attribute name="id">transbutton</xsl:attribute>
                        <xsl:attribute name="title">change script</xsl:attribute>
                        <xsl:text>A</xsl:text>
                    </xsl:element>
                    <xsl:element name="div">
                        <xsl:attribute name="id">apparatusbutton</xsl:attribute>
                        <xsl:attribute name="data-anno">apparatus of variants</xsl:attribute>
<svg id="apparatussvg" width="22" height="21" fill="#000000" version="1.1" viewBox="0 0 381.66 415.46" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000"><path d="m10.395 208.37c2.6785-185.49 346.77-166.49 346.77-166.49" stroke-width="20.48px"/><path d="m10.239 206.9c2.6785 185.49 346.77 166.49 346.77 166.49" stroke-width="20.48px"/><path d="m14.182 210.85 315.07 0.84841" stroke-width="20.581px"/><g stroke-width="21.098px"><path d="m287.4 179.06 54.215 32.066-51.981 34.443"/><path d="m307.59 9.0797 54.215 32.066-51.981 34.443"/><path d="m305.3 340.15 54.215 32.066-51.981 34.443"/></g></g></svg>
<svg id="translationsvg" width="22" height="21" fill="#000000" version="1.1" viewBox="0 0 381.66 415.46" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="22.641px"><path d="m-0.58397 41.896h381.87"/><path d="m-0.58397 205.74h381.87"/><path d="m-0.58397 369.58h381.87"/></g></svg>
                        </xsl:element>
                    </div>
                <form>
                    <button type="button" id="editbutton" title="edit record">edit</button>
                    <button type="button" id="saveas" title="download TEI XML file">save as...</button>
                </form>
            </div>
            <xsl:element name="article">
                <!--xsl:element name="h2">
                    <xsl:attribute name="class">warning</xsl:attribute>
                    <xsl:text>This is a preview. Please remember to save.</xsl:text>
                </xsl:element-->
                <xsl:apply-templates/>
            </xsl:element>
        </xsl:element>
    </xsl:element>
    <xsl:if test="x:facsimile/x:graphic">
        <xsl:element name="div">
            <xsl:attribute name="id">viewer</xsl:attribute>
            <xsl:attribute name="data-manifest">
                <xsl:value-of select="x:facsimile/x:graphic/@url"/>
            </xsl:attribute>
            <xsl:variable name="start" select="x:facsimile/x:graphic/@facs"/>
            <xsl:attribute name="data-start">
                <xsl:choose>
                    <xsl:when test="$start"><xsl:value-of select="$start - 1"/></xsl:when>
                    <xsl:otherwise>0</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
        </xsl:element>
    </xsl:if>
</xsl:template>

</xsl:stylesheet>
