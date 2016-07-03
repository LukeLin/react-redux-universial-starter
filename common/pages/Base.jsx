import React, { PropTypes, Component } from 'react';
import EventEmitter from 'events';

/**
 * https://github.com/facebook/immutable-js/blob/master/src/is.js
 * @param valueA
 * @param valueB
 * @returns {boolean}
 */
function is(valueA, valueB) {
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
        return true;
    }
    if (!valueA || !valueB) {
        return false;
    }
    if (typeof valueA.valueOf === 'function' &&
        typeof valueB.valueOf === 'function') {
        valueA = valueA.valueOf();
        valueB = valueB.valueOf();
        if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
            return true;
        }
        if (!valueA || !valueB) {
            return false;
        }
    }
    if (typeof valueA.equals === 'function' &&
        typeof valueB.equals === 'function' &&
        valueA.equals(valueB)) {
        return true;
    }
    return false;
}

function excludeFns(obj){
    if(obj == null) return obj;

    let newObj = {};

    let keys = Object.keys(obj);
    for(let key of keys){
        if(typeof obj[key] !== 'function'){
            newObj[key] = obj[key];
        }
    }

    return newObj;
}

const eventMatchReg = /^on[A-Z]/;
function getEventMethodsProps(instance){
    let methods = Object.getOwnPropertyNames(instance)
        .filter((prop) => {
            return eventMatchReg.test(prop)
                && typeof instance[prop] === 'function';
        });

    let instancePrototype = Object.getPrototypeOf(instance);
    if(instancePrototype !== Object.prototype) {
        methods = methods.concat(getEventMethodsProps(instancePrototype));
    }

    return methods
}

let mediator = new EventEmitter();

export default class Base extends Component {
    constructor(props, context){
        super(props, context);

        this.__eventBus = mediator;
        this.__eventNames = {};

        this.__bindFunctions();
    }

    __bindFunctions(){
        let props = getEventMethodsProps(this);
        for(let prop of props){
            if(!this[prop].funcBinded){
                this[prop] = this[prop].bind(this);
                this[prop].funcBinded = true;
            }
        }
    }

    on(eventName, fn){
        if(typeof fn !== 'function') throw new Error('fn should be a function');

        if(!this.__eventNames[eventName]){
            this.__eventNames[eventName] = [fn];
        } else {
            this.__eventNames[eventName].push(fn);
        }

        return this.__eventBus.addListener(eventName, fn);
    }

    emit(eventName, ...args){
        return this.__eventBus.emit(eventName, ...args);
    }

    off(eventName, fn){
        let events = this.__eventNames[eventName];
        if(events){
            let index = events.indexOf(fn);

            if(index >= 0) {
                this.__eventBus.removeListener(eventName, fn);

                events.splice(index, 1);

                if(!events.length) {
                    delete this.__eventNames[eventName];
                }
            } else {
                console.warn('event: ' + eventName + ' did not registered in ' + this._reactInternalInstance.getName() + ' Component');
            }

            return true;
        } else {
            console.warn('event: ' + eventName + ' did not registered in ' + this._reactInternalInstance.getName() + ' Component');

            return false;
        }
    }


    /**
     * 检验组件更新
     * @param nextProps
     * @param nextState
     * @returns {*}
     */
    shouldComponentUpdate(nextProps, nextState){
        return !is(excludeFns(this.props), excludeFns(nextProps)) || !is(excludeFns(this.state), excludeFns(nextState));
    }

    componentWillUnmount(){
        for(let eventName in this.__eventNames){
            if(this.__eventNames.hasOwnProperty(eventName)){
                for(let fn of this.__eventNames[eventName]){
                    this.off(eventName, fn);
                }
            }
        }
    }
}
