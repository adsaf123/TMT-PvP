var indexCopy = `
<body onload="load()" onmousemove="updateMouse(event)">
	<div id="app">
		<canvas id="treeCanvas" class="canvas" v-if="!(tmp.gameEnded && !player.keepGoing)"></canvas>

		<div v-if="false" id="loadingSection" class="fullWidth">
			<h1>Loading... (If this takes too long it means there was a serious error!)←</h1>
		</div>
		<div class="vl" v-if="player.navTab !== 'none' && tmp.other.splitScreen && player.tab!='none' && !(tmp.gameEnded && !player.keepGoing)"></div>
		<div v-if="(tmp.gameEnded && !player.keepGoing)" class="fullWidth">
			<br>
			<h2>{{modInfo.name}} {{VERSION.withoutName}}</h2><br><br>
			<h3 v-html="modInfo.winText"></h3><br>
			<h3>Please check the Discord to see if there are new content updates!</h3><br><br>
			<div v-if="!player.timePlayedReset">It took you {{formatTime(player.timePlayed)}} to beat the game.</div>
			<br>
			<button class="longUpg can" onclick="hardReset(true)">Play Again</button>&nbsp;&nbsp;&nbsp;&nbsp;<button
				class="longUpg can" onclick="keepGoing()">Keep Going</button>
			<br><br><br>
			<span v-if="modInfo.discordLink"><a class="link" v-bind:href="modInfo.discordLink"
					target="_blank">{{modInfo.discordName}}</a><br></span>
			<a class="link" href="https://discord.gg/F3xveHV" target="_blank"
				v-bind:style="modInfo.discordLink ? {'font-size': '16px'} : {}">The Modding Tree Discord</a><br>
			<a class="link" href="http://discord.gg/wwQfgPa" target="_blank" v-bind:style="{'font-size': '16px'}">Main
				Prestige Tree server</a><br>
			<br><br>
		</div>

		<div id="treeOverlay" v-if="!(tmp.gameEnded && !player.keepGoing) && (player.tab === 'none' || tmp.other.splitScreen || !readData(layoutInfo.showTree))" class="treeOverlay" onscroll="resizeCanvas()"
			v-bind:class="{ 
			fullWidth: (player.tab == 'none' || player.navTab == 'none'), 
			col: (player.tab !== 'none' && player.navTab !== 'none'), 
			left: (player.tab !== 'none' && player.navTab !== 'none')}"
			 :style="{'margin-top': !readData(layoutInfo.showTree) && player.tab == 'info-tab' ? '50px' : ''}">
			<div id="version" onclick="showTab('changelog-tab')" class="overlayThing" style="margin-right: 13px" >
				{{VERSION.withoutName}}</div>
			<button
			v-if="((player.navTab == 'none' && (tmp[player.tab].row == 'side' || tmp[player.tab].row == 'otherside' || player[player.tab].prevTab)) || player[player.navTab]?.prevTab)"				class="other-back overlayThing" onclick="goBack(player.navTab == 'none' ? player.tab : player.navTab)">←</button>
			<img id="optionWheel" class="overlayThing" v-if="player.tab!='options-tab'" src="options_wheel.png"
				onclick="showTab('options-tab')"></img>
			<div id="info" v-if="player.tab!='info-tab'" class="overlayThing" onclick="showTab('info-tab')"><br>i</div>
			<div id="discord" class="overlayThing">
				<img onclick="window.open((modInfo.discordLink ? modInfo.discordLink : 'https://discord.gg/F3xveHV'),'mywindow')"
					src="discord.png" target="_blank"></img>
				<ul id="discord-links">
					<li v-if="modInfo.discordLink"><a class="link" v-bind:href="modInfo.discordLink"
							target="_blank">{{modInfo.discordName}}</a><br></li>
					<li><a class="link" href="https://discord.gg/F3xveHV" target="_blank"
							v-bind:style="modInfo.discordLink ? {'font-size': '16px'} : {}">The Modding Tree
							Discord</a><br></li>
					<li><a class="link" href="http://discord.gg/wwQfgPa" target="_blank"
							v-bind:style="{'font-size': '16px'}">Main Prestige Tree server</a></li>
				</ul>
			</div>
			<overlay-head v-if="!(tmp.gameEnded && !player.keepGoing)"></overlay-head>
			<div class="sideLayers">
				<div v-for="(node, index) in OTHER_LAYERS['side']">
					<tree-node :layer='node' :abb='tmp[node].symbol' :size="'small'" :key="'side' + index"></tree-node>
				</div>
			</div>
		</div>
		
		<div v-if="!(tmp.gameEnded && !player.keepGoing) && (player.tab === 'none' || tmp.other.splitScreen)" id="treeTab"  onscroll="resizeCanvas()" 
			v-bind:class="{ fullWidth: (player.tab == 'none' || player.navTab == 'none'), col: (player.tab !== 'none' && player.navTab !== 'none'), left: (player.tab !== 'none' && player.navTab !== 'none')}">
			<br><br><br><br>
			<overlay-head id="fakeHead" style="visibility: hidden;">
			</overlay-head>
			<layer-tab :layer="player.navTab == 'none' ? player.tab : player.navTab" :key="'left'"></layer-tab>
			<bg :layer="player.navTab == 'none' ? player.tab : player.navTab" ></bg>
		</div>

		<!-- Popups -->
		<div class="popup-container">
			<transition-group name="fade">
				<div v-for="popup,index in activePopups" class="popup" v-bind:class="popup.type"
					v-bind:key="'p' + popup.id" v-on:click="() => {activePopups.splice(index, 1)}" v-bind:style="popup.color ? {'background-color': popup.color} : {}">
					<h3>{{popup.title}}</h3><br>
					<h2 v-html="popup.message"></h2>
				</div>
			</transition-group>
		</div>
		<div class="particle-container">
				<div v-for="particle,index in particles">
					<particle :data="particle" :index="index" v-bind:key="'b' + particle.id"></particle>
				</div>
		</div>

		<div v-if="player.navTab !== 'none' && player.tab !== 'none' && !(tmp.gameEnded && !player.keepGoing)" onscroll="resizeCanvas()" v-bind:class="{ fullWidth: player.navTab == 'none' || !tmp.other.splitScreen || !readData(layoutInfo.showTree), col: player.navTab != 'none', right: player.navTab != 'none', fast: true, tab: true}">
			<div v-for="layer in LAYERS">
				<div v-if="player.tab==layer">
					<layer-tab :layer="layer" :back="'none'" :spacing="'50px'" :key="'left'"></layer-tab>
				</div>
			</div>
			<bg :layer="player.tab" ></bg>

		</div>
		<div class = "bg2" v-bind:style = "tmp.backgroundStyle"></div>

	</div>
</body>
`