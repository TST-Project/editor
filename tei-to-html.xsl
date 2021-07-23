<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:exsl="http://exslt.org/common"
                xmlns:x="http://www.tei-c.org/ns/1.0"
                xmlns:tst="https://github.com/tst-project"
                exclude-result-prefixes="x tst">

<xsl:import href="../lib/xslt/definitions.xsl"/>
<xsl:import href="../lib/xslt/functions.xsl"/>
<xsl:import href="../lib/xslt/common.xsl"/>
<xsl:import href="../lib/xslt/teiheader.xsl"/>
<xsl:import href="../lib/xslt/transcription.xsl"/>
<!--xsl:import href="../lib/xslt/tei-to-html.xsl"/-->

<!-- these imports are compiled by Javascript, since WebKit's XSLTProcessor() don't play well with it -->

<xsl:output method="html" encoding="UTF-8" omit-xml-declaration="yes"/>
<xsl:template match="x:TEI">
    <xsl:element name="div">
        <xsl:attribute name="id">recordcontainer</xsl:attribute>
        <xsl:attribute name="lang">en</xsl:attribute>
        <xsl:element name="div">
            <xsl:choose>
                <xsl:when test="x:facsimile/x:graphic/@url">
                    <xsl:attribute name="class">record-thin</xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:attribute name="class">record-fat</xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <!--xsl:attribute name="class">record-fat</xsl:attribute-->
            <div id="topbar">
                <div id="transbutton" title="change script">A</div>
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
                    <xsl:when test="$start"><xsl:value-of select="($start - 1)"/></xsl:when>
                    <xsl:otherwise>0</xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
        </xsl:element>
    </xsl:if>
</xsl:template>

</xsl:stylesheet>
