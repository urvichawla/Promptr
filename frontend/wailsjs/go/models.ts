export namespace macos {
	
	export class ShortcutStatus {
	    label: string;
	    ready: boolean;
	    registered: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new ShortcutStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.ready = source["ready"];
	        this.registered = source["registered"];
	        this.error = source["error"];
	    }
	}

}

export namespace paste {
	
	export class Result {
	    status: string;
	    target: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new Result(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.target = source["target"];
	        this.message = source["message"];
	    }
	}
	export class Target {
	    id: string;
	    name: string;
	    detail: string;
	    icon: string;
	    running: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Target(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.detail = source["detail"];
	        this.icon = source["icon"];
	        this.running = source["running"];
	    }
	}
	export class Targets {
	    selected: string;
	    targets: Target[];
	
	    static createFrom(source: any = {}) {
	        return new Targets(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.selected = source["selected"];
	        this.targets = this.convertValues(source["targets"], Target);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace store {
	
	export class Prompt {
	    id: number;
	    title: string;
	    content: string;
	    tags: string[];
	    favorite: boolean;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Prompt(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.tags = source["tags"];
	        this.favorite = source["favorite"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class PromptInput {
	    title: string;
	    content: string;
	    tags: string[];
	
	    static createFrom(source: any = {}) {
	        return new PromptInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.content = source["content"];
	        this.tags = source["tags"];
	    }
	}

}

